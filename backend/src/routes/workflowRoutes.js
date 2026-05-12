/**
 * Workflow Routes
 * Provides endpoints for workflow automation and management
 */
import express from "express";
import { guardAdmin, guardSuperAdmin } from "../middleware/guards.js";
import workflowService from "../services/workflowService.js";

const router = express.Router();

// All routes require admin access
router.use(...guardAdmin);

/**
 * POST /api/workflow/process/:grievanceId
 * Process grievance through workflow automation
 */
router.post("/process/:grievanceId", async (req, res, next) => {
  try {
    const { grievanceId } = req.params;
    const options = req.body || {};

    const results = await workflowService.processGrievance(grievanceId, options);
    res.json({
      message: "Workflow processing completed",
      results
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/workflow/assign/:grievanceId
 * Manual assignment with workflow suggestions
 */
router.post("/assign/:grievanceId", async (req, res, next) => {
  try {
    const { grievanceId } = req.params;
    const { adminId, reason } = req.body;

    const grievance = await Grievance.findById(grievanceId);
    if (!grievance) {
      return res.status(404).json({ message: "Grievance not found" });
    }

    // Get assignment suggestions
    const suggestions = await workflowService.getAssignmentSuggestions(grievance);

    // Apply manual assignment
    grievance.assignedTo = adminId;
    grievance.assignedAt = new Date();
    grievance.assignmentReason = reason || 'Manual assignment';
    grievance.status = 'InProgress';
    await grievance.save();

    res.json({
      message: "Grievance assigned successfully",
      grievance: grievance._id,
      assignedTo: adminId,
      suggestions
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/workflow/suggestions/:grievanceId
 * Get workflow suggestions for grievance
 */
router.get("/suggestions/:grievanceId", async (req, res, next) => {
  try {
    const { grievanceId } = req.params;

    const grievance = await Grievance.findById(grievanceId)
      .populate('department student');

    if (!grievance) {
      return res.status(404).json({ message: "Grievance not found" });
    }

    const suggestions = await workflowService.getAssignmentSuggestions(grievance);
    res.json(suggestions);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/workflow/rules
 * Get workflow rules configuration
 */
router.get("/rules", async (req, res, next) => {
  try {
    const rules = await workflowService.getWorkflowRules();
    res.json(rules);
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/workflow/rules
 * Update workflow rules (superadmin only)
 */
router.put("/rules", ...guardSuperAdmin, async (req, res, next) => {
  try {
    const { rules } = req.body;
    const updatedRules = await workflowService.updateWorkflowRules(rules);
    res.json({
      message: "Workflow rules updated successfully",
      rules: updatedRules
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/workflow/escalate/:grievanceId
 * Manual escalation
 */
router.post("/escalate/:grievanceId", async (req, res, next) => {
  try {
    const { grievanceId } = req.params;
    const { escalateTo, reason, notifyUsers } = req.body;

    const result = await workflowService.manualEscalate(
      grievanceId, 
      escalateTo, 
      reason, 
      notifyUsers
    );

    res.json({
      message: "Grievance escalated successfully",
      result
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/workflow/workload
 * Get admin workload statistics
 */
router.get("/workload", async (req, res, next) => {
  try {
    const { departmentId } = req.query;
    const workload = await workflowService.getWorkloadStats(departmentId);
    res.json(workload);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/workflow/sla-check
 * Check and process SLA breaches
 */
router.post("/sla-check", ...guardSuperAdmin, async (req, res, next) => {
  try {
    const results = await workflowService.processSLABreaches();
    res.json({
      message: "SLA breach check completed",
      processed: results.length,
      results
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/workflow/performance
 * Get workflow performance metrics
 */
router.get("/performance", async (req, res, next) => {
  try {
    const { dateRange = '30d' } = req.query;
    const performance = await workflowService.getPerformanceMetrics(dateRange);
    res.json(performance);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/workflow/bulk-process
 * Process multiple grievances through workflow
 */
router.post("/bulk-process", async (req, res, next) => {
  try {
    const { grievanceIds, options } = req.body;

    if (!Array.isArray(grievanceIds) || grievanceIds.length === 0) {
      return res.status(400).json({ message: "Grievance IDs are required" });
    }

    const results = [];
    for (const grievanceId of grievanceIds) {
      try {
        const result = await workflowService.processGrievance(grievanceId, options);
        results.push({
          grievanceId,
          success: true,
          result
        });
      } catch (error) {
        results.push({
          grievanceId,
          success: false,
          error: error.message
        });
      }
    }

    res.json({
      message: "Bulk workflow processing completed",
      processed: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/workflow/automation-status
 * Get automation system status
 */
router.get("/automation-status", async (req, res, next) => {
  try {
    const status = await workflowService.getAutomationStatus();
    res.json(status);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/workflow/test-rule
 * Test workflow rule on sample data
 */
router.post("/test-rule", async (req, res, next) => {
  try {
    const { ruleType, testData } = req.body;

    const result = await workflowService.testRule(ruleType, testData);
    res.json({
      message: "Rule test completed",
      result
    });
  } catch (err) {
    next(err);
  }
});

export default router;
