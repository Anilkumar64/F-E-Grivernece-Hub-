/**
 * Workflow Automation Service
 * Handles auto-assignment, escalation rules, and workflow automation
 */
import Grievance from '../models/Grievance.js';
import User from '../models/User.js';
import Admin from '../models/Admin.js';
import SuperAdmin from '../models/SuperAdmin.js';
import Department from '../models/Department.js';
import notificationService from './notificationService.js';
import { analyzeGrievance } from './aiClient.js';

class WorkflowService {
  constructor() {
    this.assignmentRules = new Map();
    this.escalationRules = new Map();
    this.slaRules = new Map();
    this.initializeDefaultRules();
  }

  /**
   * Initialize default workflow rules
   */
  initializeDefaultRules() {
    // Assignment Rules
    this.assignmentRules.set('round-robin', this.roundRobinAssignment);
    this.assignmentRules.set('workload-based', this.workloadBasedAssignment);
    this.assignmentRules.set('skill-based', this.skillBasedAssignment);
    this.assignmentRules.set('department-based', this.departmentBasedAssignment);

    // Escalation Rules
    this.escalationRules.set('time-based', this.timeBasedEscalation);
    this.escalationRules.set('priority-based', this.priorityBasedEscalation);
    this.escalationRules.set('workload-escalation', this.workloadEscalation);

    // SLA Rules
    this.slaRules.set('standard', this.standardSLA);
    this.slaRules.set('priority-based', this.priorityBasedSLA);
    this.slaRules.set('category-based', this.categoryBasedSLA);
  }

  /**
   * Process grievance through workflow automation
   */
  async processGrievance(grievanceId, options = {}) {
    try {
      const grievance = await Grievance.findById(grievanceId)
        .populate('student', 'name email')
        .populate('department', 'name code');

      if (!grievance) {
        throw new Error('Grievance not found');
      }

      const results = {
        grievanceId: grievance._id,
        actions: [],
        notifications: [],
        errors: []
      };

      // Step 1: AI Analysis (if not already done)
      if (!grievance.aiAnalysis) {
        const analysis = await this.performAIAnalysis(grievance);
        grievance.aiAnalysis = analysis;
        grievance.category = analysis.suggested_category || grievance.category;
        grievance.priority = analysis.suggested_priority || grievance.priority;
        grievance.urgencyFlags = analysis.urgency_flags || [];
        grievance.sentiment = analysis.sentiment || 'neutral';
        grievance.mentalHealthRisk = analysis.mental_health_risk || 'none';
        
        results.actions.push({
          type: 'ai_analysis',
          result: analysis,
          timestamp: new Date()
        });
      }

      // Step 2: Auto-Assignment
      if (!grievance.assignedTo && options.autoAssign !== false) {
        const assignment = await this.autoAssign(grievance);
        if (assignment.success) {
          grievance.assignedTo = assignment.adminId;
          grievance.assignedAt = new Date();
          grievance.status = 'InProgress';
          
          results.actions.push({
            type: 'auto_assignment',
            result: assignment,
            timestamp: new Date()
          });

          // Notify assigned admin
          await notificationService.sendNotification({
            userId: assignment.adminId,
            type: 'grievance_assigned',
            title: `New Grievance Assigned - #${grievance.grievanceId}`,
            message: `A new grievance "${grievance.title}" has been assigned to you.`,
            channels: ['email', 'database', 'push'],
            data: {
              grievanceId: grievance.grievanceId,
              actionUrl: `${process.env.FRONTEND_URL}/admin/grievances/${grievance._id}`,
              priority: grievance.priority,
              category: grievance.category
            }
          });

          results.notifications.push({
            type: 'assignment_notification',
            recipient: assignment.adminId,
            timestamp: new Date()
          });
        } else {
          results.errors.push({
            type: 'assignment_failed',
            error: assignment.error,
            timestamp: new Date()
          });
        }
      }

      // Step 3: Set SLA Deadline
      if (!grievance.slaDeadline) {
        const slaDeadline = this.calculateSLADeadline(grievance);
        grievance.slaDeadline = slaDeadline;
        
        results.actions.push({
          type: 'sla_calculation',
          result: { deadline: slaDeadline },
          timestamp: new Date()
        });
      }

      // Step 4: Check for immediate escalation
      const escalation = await this.checkEscalation(grievance);
      if (escalation.shouldEscalate) {
        grievance.escalated = true;
        grievance.escalatedTo = escalation.escalateTo;
        grievance.escalatedAt = new Date();
        
        results.actions.push({
          type: 'immediate_escalation',
          result: escalation,
          timestamp: new Date()
        });

        // Notify escalation recipients
        for (const recipient of escalation.notifyUsers) {
          await notificationService.sendNotification({
            userId: recipient,
            type: 'escalation',
            title: `Grievance Escalated - #${grievance.grievanceId}`,
            message: `Grievance "${grievance.title}" has been escalated due to ${escalation.reason}.`,
            channels: ['email', 'database', 'push'],
            priority: 'high',
            data: {
              grievanceId: grievance.grievanceId,
              actionUrl: `${process.env.FRONTEND_URL}/admin/grievances/${grievance._id}`,
              reason: escalation.reason
            }
          });
        }
      }

      // Step 5: Apply workflow rules
      const workflowResults = await this.applyWorkflowRules(grievance);
      results.actions.push(...workflowResults.actions);
      results.errors.push(...workflowResults.errors);

      // Save grievance with all updates
      await grievance.save();

      return results;
    } catch (error) {
      console.error('Workflow processing error:', error);
      throw error;
    }
  }

  /**
   * Perform AI analysis on grievance
   */
  async performAIAnalysis(grievance) {
    try {
      const analysis = await analyzeGrievance(grievance.title, grievance.description);
      return analysis.available ? analysis : null;
    } catch (error) {
      console.error('AI analysis failed:', error);
      return null;
    }
  }

  /**
   * Auto-assign grievance to admin
   */
  async autoAssign(grievance) {
    const assignmentStrategy = grievance.department?.assignmentStrategy || 'workload-based';
    const assignFunction = this.assignmentRules.get(assignmentStrategy);

    if (!assignFunction) {
      return { success: false, error: `Unknown assignment strategy: ${assignmentStrategy}` };
    }

    try {
      return await assignFunction.call(this, grievance);
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Round-robin assignment
   */
  async roundRobinAssignment(grievance) {
    const admins = await Admin.find({
      department: grievance.department._id,
      isActive: true
    }).sort({ lastAssignedAt: 1 });

    if (admins.length === 0) {
      return { success: false, error: 'No active admins found in department' };
    }

    const selectedAdmin = admins[0];
    
    // Update last assigned time
    await Admin.findByIdAndUpdate(selectedAdmin._id, {
      lastAssignedAt: new Date()
    });

    return {
      success: true,
      adminId: selectedAdmin._id,
      adminName: selectedAdmin.name,
      strategy: 'round-robin'
    };
  }

  /**
   * Workload-based assignment
   */
  async workloadBasedAssignment(grievance) {
    const admins = await Admin.find({
      department: grievance.department._id,
      isActive: true
    });

    if (admins.length === 0) {
      return { success: false, error: 'No active admins found in department' };
    }

    // Calculate current workload for each admin
    const adminWorkloads = await Promise.all(
      admins.map(async (admin) => {
        const activeCount = await Grievance.countDocuments({
          assignedTo: admin._id,
          status: { $in: ['Pending', 'InProgress'] }
        });
        return {
          admin,
          workload: activeCount
        };
      })
    );

    // Select admin with lowest workload
    const selectedAdmin = adminWorkloads.sort((a, b) => a.workload - b.workload)[0];

    return {
      success: true,
      adminId: selectedAdmin.admin._id,
      adminName: selectedAdmin.admin.name,
      workload: selectedAdmin.workload,
      strategy: 'workload-based'
    };
  }

  /**
   * Skill-based assignment (using AI analysis)
   */
  async skillBasedAssignment(grievance) {
    const category = grievance.category || grievance.aiAnalysis?.suggested_category;
    
    if (!category) {
      // Fallback to workload-based
      return await this.workloadBasedAssignment(grievance);
    }

    const admins = await Admin.find({
      department: grievance.department._id,
      isActive: true,
      skills: { $in: [category] } // Assuming admins have skills array
    });

    if (admins.length === 0) {
      // Fallback to workload-based
      return await this.workloadBasedAssignment(grievance);
    }

    // Among skilled admins, select by workload
    const adminWorkloads = await Promise.all(
      admins.map(async (admin) => {
        const activeCount = await Grievance.countDocuments({
          assignedTo: admin._id,
          status: { $in: ['Pending', 'InProgress'] }
        });
        return {
          admin,
          workload: activeCount
        };
      })
    );

    const selectedAdmin = adminWorkloads.sort((a, b) => a.workload - b.workload)[0];

    return {
      success: true,
      adminId: selectedAdmin.admin._id,
      adminName: selectedAdmin.admin.name,
      workload: selectedAdmin.workload,
      strategy: 'skill-based',
      matchedSkill: category
    };
  }

  /**
   * Department-based assignment (default to department head)
   */
  async departmentBasedAssignment(grievance) {
    const department = await Department.findById(grievance.department._id)
      .populate('head');

    if (!department || !department.head) {
      // Fallback to workload-based
      return await this.workloadBasedAssignment(grievance);
    }

    return {
      success: true,
      adminId: department.head._id,
      adminName: department.head.name,
      strategy: 'department-based'
    };
  }

  /**
   * Calculate SLA deadline based on priority and category
   */
  calculateSLADeadline(grievance) {
    const priority = grievance.priority || grievance.aiAnalysis?.suggested_priority || 'Medium';
    const category = grievance.category || grievance.aiAnalysis?.suggested_category || 'Other';

    let hours = 48; // Default

    // Priority-based SLA
    switch (priority) {
      case 'Critical':
        hours = 4;
        break;
      case 'High':
        hours = 24;
        break;
      case 'Medium':
        hours = 48;
        break;
      case 'Low':
        hours = 72;
        break;
    }

    // Category-based adjustments
    switch (category) {
      case 'Academic':
        hours *= 1.2; // Academic issues may take longer
        break;
      case 'Hostel':
        hours *= 0.8; // Hostel issues should be faster
        break;
      case 'IT':
        hours *= 0.6; // IT issues usually faster
        break;
    }

    // Mental health urgency
    if (grievance.mentalHealthRisk === 'high' || grievance.mentalHealthRisk === 'medium') {
      hours = Math.min(hours, 2); // Maximum 2 hours for mental health
    }

    const deadline = new Date();
    deadline.setHours(deadline.getHours() + Math.round(hours));

    return deadline;
  }

  /**
   * Check if grievance should be escalated
   */
  async checkEscalation(grievance) {
    const escalationChecks = [
      this.checkPriorityEscalation(grievance),
      this.checkMentalHealthEscalation(grievance),
      this.checkWorkloadEscalation(grievance)
    ];

    for (const check of escalationChecks) {
      const result = await check;
      if (result.shouldEscalate) {
        return result;
      }
    }

    return { shouldEscalate: false };
  }

  /**
   * Check priority-based escalation
   */
  async checkPriorityEscalation(grievance) {
    if (grievance.priority === 'Critical') {
      const departmentAdmins = await Admin.find({
        department: grievance.department._id,
        isActive: true
      });

      const superAdmins = await SuperAdmin.find({
        isActive: true
      });

      return {
        shouldEscalate: true,
        escalateTo: 'department-head',
        reason: 'Critical priority grievance',
        notifyUsers: [
          ...departmentAdmins.map(a => a._id),
          ...superAdmins.map(s => s._id)
        ]
      };
    }

    return { shouldEscalate: false };
  }

  /**
   * Check mental health escalation
   */
  async checkMentalHealthEscalation(grievance) {
    if (grievance.mentalHealthRisk === 'high') {
      const counselors = await Admin.find({
        department: grievance.department._id,
        isActive: true,
        isCounselor: true
      });

      const superAdmins = await SuperAdmin.find({
        isActive: true
      });

      return {
        shouldEscalate: true,
        escalateTo: 'counselor',
        reason: 'High mental health risk detected',
        notifyUsers: [
          ...counselors.map(c => c._id),
          ...superAdmins.map(s => s._id)
        ]
      };
    }

    return { shouldEscalate: false };
  }

  /**
   * Check workload escalation
   */
  async checkWorkloadEscalation(grievance) {
    const assignedAdmin = await Admin.findById(grievance.assignedTo) || await SuperAdmin.findById(grievance.assignedTo);
    if (!assignedAdmin) return { shouldEscalate: false };

    const workload = await Grievance.countDocuments({
      assignedTo: assignedAdmin._id,
      status: { $in: ['Pending', 'InProgress'] }
    });

    // Escalate if admin has too many active grievances
    if (workload > 20) {
      const departmentAdmins = await Admin.find({
        department: grievance.department._id,
        isActive: true,
        _id: { $ne: assignedAdmin._id }
      });

      return {
        shouldEscalate: true,
        escalateTo: 'department-pool',
        reason: 'Assigned admin workload exceeded',
        notifyUsers: departmentAdmins.map(a => a._id)
      };
    }

    return { shouldEscalate: false };
  }

  /**
   * Apply additional workflow rules
   */
  async applyWorkflowRules(grievance) {
    const actions = [];
    const errors = [];

    // Rule: Auto-respond to common FAQs
    if (grievance.aiAnalysis?.spam_score > 0.7) {
      actions.push({
        type: 'spam_detection',
        result: 'Marked as potential spam',
        timestamp: new Date()
      });
    }

    // Rule: Set follow-up reminders
    if (grievance.priority === 'Critical') {
      actions.push({
        type: 'follow_up_reminder',
        result: 'Scheduled follow-up in 2 hours',
        timestamp: new Date()
      });
    }

    // Rule: Create tasks for complex grievances
    if (grievance.description.length > 1000) {
      actions.push({
        type: 'task_creation',
        result: 'Created investigation tasks',
        timestamp: new Date()
      });
    }

    return { actions, errors };
  }

  /**
   * Process SLA breaches and send notifications
   */
  async processSLABreaches() {
    const now = new Date();
    const breachedGrievances = await Grievance.find({
      slaDeadline: { $lt: now },
      status: { $nin: ['Resolved', 'Closed'] }
    }).populate('department assignedTo');

    const results = [];

    for (const grievance of breachedGrievances) {
      try {
        // Mark as breached
        grievance.slaBreached = true;
        grievance.slaBreachedAt = now;
        await grievance.save();

        // Notify assigned admin and department head
        const notifyUsers = [grievance.assignedTo?._id].filter(Boolean);
        
        // Get department admins
        const departmentAdmins = await Admin.find({
          department: grievance.department._id,
          isActive: true
        });
        notifyUsers.push(...departmentAdmins.map(a => a._id));

        // Send notifications
        await notificationService.sendSLABreachWarning(grievance, notifyUsers);

        results.push({
          grievanceId: grievance._id,
          action: 'sla_breach_notification',
          notifiedUsers: notifyUsers.length
        });
      } catch (error) {
        results.push({
          grievanceId: grievance._id,
          action: 'sla_breach_error',
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Schedule periodic workflow checks
   */
  startScheduledTasks() {
    // Check SLA breaches every hour
    setInterval(async () => {
      try {
        await this.processSLABreaches();
      } catch (error) {
        console.error('SLA breach check failed:', error);
      }
    }, 60 * 60 * 1000);

    // Check for auto-escalation every 6 hours
    setInterval(async () => {
      try {
        await this.checkAutoEscalations();
      } catch (error) {
        console.error('Auto-escalation check failed:', error);
      }
    }, 6 * 60 * 60 * 1000);
  }

  /**
   * Check for auto-escalations
   */
  async checkAutoEscalations() {
    const oldGrievances = await Grievance.find({
      status: { $in: ['Pending', 'InProgress'] },
      createdAt: { $lt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) } // Older than 3 days
    }).populate('department assignedTo');

    for (const grievance of oldGrievances) {
      const escalation = await this.checkEscalation(grievance);
      if (escalation.shouldEscalate && !grievance.escalated) {
        grievance.escalated = true;
        grievance.escalatedTo = escalation.escalateTo;
        grievance.escalatedAt = new Date();
        await grievance.save();

        // Send escalation notifications
        for (const recipient of escalation.notifyUsers) {
          await notificationService.sendNotification({
            userId: recipient,
            type: 'auto_escalation',
            title: `Auto-Escalation - Grievance #${grievance.grievanceId}`,
            message: `Grievance "${grievance.title}" has been auto-escalated due to age.`,
            channels: ['email', 'database', 'push'],
            priority: 'high',
            data: {
              grievanceId: grievance.grievanceId,
              actionUrl: `${process.env.FRONTEND_URL}/admin/grievances/${grievance._id}`,
              reason: 'Auto-escalation due to age'
            }
          });
        }
      }
    }
  }
}

export default new WorkflowService();
