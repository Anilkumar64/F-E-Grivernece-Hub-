/**
 * Analytics Routes
 * Provides comprehensive analytics endpoints for admin dashboard
 */
import express from "express";
import { guardAdmin, guardSuperAdmin } from "../middleware/guards.js";
import analyticsService from "../services/analyticsService.js";

const router = express.Router();

// All routes require admin or superadmin access
router.use(...guardAdmin);

/**
 * GET /api/analytics/dashboard
 * Get comprehensive dashboard analytics
 */
router.get("/dashboard", async (req, res, next) => {
  try {
    const filters = {
      dateRange: req.query.dateRange || '30d',
      departmentId: req.query.departmentId,
      category: req.query.category,
      status: req.query.status,
      priority: req.query.priority
    };

    const analytics = await analyticsService.getDashboardAnalytics(filters);
    res.json(analytics);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/analytics/overview
 * Get quick overview stats
 */
router.get("/overview", async (req, res, next) => {
  try {
    const filters = {
      dateRange: req.query.dateRange || '7d'
    };

    const analytics = await analyticsService.getDashboardAnalytics(filters);
    res.json({
      overview: analytics.overview,
      trends: analytics.trends.slice(-7), // Last 7 days
      lastUpdated: analytics.lastUpdated
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/analytics/departments
 * Get department-wise statistics
 */
router.get("/departments", async (req, res, next) => {
  try {
    const filters = {
      dateRange: req.query.dateRange || '30d'
    };

    const analytics = await analyticsService.getDashboardAnalytics(filters);
    res.json({
      departmentStats: analytics.departmentStats,
      lastUpdated: analytics.lastUpdated
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/analytics/performance
 * Get performance metrics
 */
router.get("/performance", async (req, res, next) => {
  try {
    const filters = {
      dateRange: req.query.dateRange || '30d'
    };

    const analytics = await analyticsService.getDashboardAnalytics(filters);
    res.json({
      performance: analytics.performance,
      lastUpdated: analytics.lastUpdated
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/analytics/predictions
 * Get predictive analytics from AI service
 */
router.get("/predictions", async (req, res, next) => {
  try {
    const filters = {
      dateRange: req.query.dateRange || '30d'
    };

    const analytics = await analyticsService.getDashboardAnalytics(filters);
    res.json({
      predictions: analytics.predictions,
      lastUpdated: analytics.lastUpdated
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/analytics/export
 * Export analytics data as CSV/Excel
 */
router.get("/export", async (req, res, next) => {
  try {
    const { format = 'csv', type = 'dashboard' } = req.query;
    const filters = {
      dateRange: req.query.dateRange || '30d',
      departmentId: req.query.departmentId,
      category: req.query.category,
      status: req.query.status,
      priority: req.query.priority
    };

    const analytics = await analyticsService.getDashboardAnalytics(filters);

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="analytics-${type}-${Date.now()}.csv"`);
      
      let csv = '';
      
      if (type === 'dashboard') {
        csv = 'Metric,Value\n';
        csv += `Total Grievances,${analytics.overview.totalGrievances}\n`;
        csv += `Resolved Grievances,${analytics.overview.resolvedGrievances}\n`;
        csv += `Pending Grievances,${analytics.overview.pendingGrievances}\n`;
        csv += `Resolution Rate,${analytics.overview.resolutionRate}%\n`;
        csv += `Average Resolution Time,${analytics.overview.avgResolutionTime} hours\n`;
        csv += `Overdue Grievances,${analytics.overview.overdueGrievances}\n`;
        csv += `Critical Grievances,${analytics.overview.criticalGrievances}\n`;
      } else if (type === 'departments') {
        csv = 'Department,Total,Resolved,Pending,In Progress,Overdue,Resolution Rate,Avg Resolution Time\n';
        analytics.departmentStats.forEach(dept => {
          csv += `"${dept.departmentName}",${dept.total},${dept.resolved},${dept.pending},${dept.inProgress},${dept.overdue},${dept.resolutionRate}%,${dept.avgResolutionTime}\n`;
        });
      }

      res.send(csv);
    } else {
      res.status(400).json({ message: 'Unsupported format' });
    }
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/analytics/real-time
 * Get real-time metrics for dashboard
 */
router.get("/real-time", async (req, res, next) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const [
      todayStats,
      activeUsers,
      pendingCritical,
      systemHealth
    ] = await Promise.all([
      // Today's statistics
      analyticsService.getDashboardAnalytics({ dateRange: '1d' }),
      // Active users (mock implementation)
      getActiveUsers(),
      // Pending critical grievances
      getPendingCritical(),
      // System health
      getSystemHealth()
    ]);

    res.json({
      today: todayStats.overview,
      activeUsers,
      pendingCritical,
      systemHealth,
      timestamp: now
    });
  } catch (err) {
    next(err);
  }
});

// Helper functions (implement these based on your needs)
async function getActiveUsers() {
  // Mock implementation - replace with actual logic
  return {
    total: 245,
    students: 198,
    admins: 47
  };
}

async function getPendingCritical() {
  // Mock implementation - replace with actual logic
  return {
    count: 8,
    grievances: [
      { id: 'GRV-001', title: 'System outage in lab', department: 'IT' },
      { id: 'GRV-002', title: 'Hostel security issue', department: 'Admin' }
    ]
  };
}

async function getSystemHealth() {
  // Mock implementation - replace with actual logic
  return {
    database: 'healthy',
    aiService: 'healthy',
    notificationService: 'healthy',
    overall: 'healthy'
  };
}

export default router;
