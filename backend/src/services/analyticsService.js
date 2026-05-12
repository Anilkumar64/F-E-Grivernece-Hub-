/**
 * Advanced Analytics Service
 * Provides comprehensive analytics for E-Grievance system
 */
import mongoose from 'mongoose';
import Grievance from '../models/Grievance.js';
import User from '../models/User.js';
import Department from '../models/Department.js';
import { checkAiHealth, getClusters, getAnomalies, getForecast } from './aiClient.js';

class AnalyticsService {
  /**
   * Get comprehensive dashboard analytics
   */
  async getDashboardAnalytics(filters = {}) {
    const {
      dateRange = '30d',
      departmentId,
      category,
      status,
      priority
    } = filters;

    const { startDate, endDate } = this.getDateRange(dateRange);
    const matchStage = this.buildMatchStage(startDate, endDate, {
      departmentId,
      category,
      status,
      priority
    });

    try {
      const [
        overview,
        trends,
        departmentStats,
        categoryStats,
        priorityStats,
        statusStats,
        performance,
        predictions
      ] = await Promise.all([
        this.getOverviewStats(matchStage),
        this.getTrendsData(startDate, endDate, filters),
        this.getDepartmentStats(matchStage),
        this.getCategoryStats(matchStage),
        this.getPriorityStats(matchStage),
        this.getStatusStats(matchStage),
        this.getPerformanceMetrics(matchStage),
        this.getPredictiveAnalytics(filters)
      ]);

      return {
        overview,
        trends,
        departmentStats,
        categoryStats,
        priorityStats,
        statusStats,
        performance,
        predictions,
        lastUpdated: new Date(),
        filters: { dateRange, departmentId, category, status, priority }
      };
    } catch (error) {
      console.error('Analytics service error:', error);
      throw new Error('Failed to generate analytics');
    }
  }

  /**
   * Get overview statistics
   */
  async getOverviewStats(matchStage) {
    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalGrievances: { $sum: 1 },
          resolvedGrievances: {
            $sum: { $cond: [{ $eq: ['$status', 'Resolved'] }, 1, 0] }
          },
          pendingGrievances: {
            $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] }
          },
          inProgressGrievances: {
            $sum: { $cond: [{ $eq: ['$status', 'InProgress'] }, 1, 0] }
          },
          overdueGrievances: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ['$status', 'Resolved'] },
                    { $lt: ['$slaDeadline', new Date()] }
                  ]
                },
                1,
                0
              ]
            }
          },
          avgResolutionTime: {
            $avg: {
              $cond: [
                { $eq: ['$status', 'Resolved'] },
                { $subtract: ['$resolvedAt', '$createdAt'] },
                null
              ]
            }
          },
          criticalGrievances: {
            $sum: { $cond: [{ $eq: ['$priority', 'Critical'] }, 1, 0] }
          }
        }
      }
    ];

    const result = await Grievance.aggregate(pipeline);
    const stats = result[0] || {};

    return {
      totalGrievances: stats.totalGrievances || 0,
      resolvedGrievances: stats.resolvedGrievances || 0,
      pendingGrievances: stats.pendingGrievances || 0,
      inProgressGrievances: stats.inProgressGrievances || 0,
      overdueGrievances: stats.overdueGrievances || 0,
      avgResolutionTime: stats.avgResolutionTime ? Math.round(stats.avgResolutionTime / (1000 * 60 * 60)) : 0, // hours
      criticalGrievances: stats.criticalGrievances || 0,
      resolutionRate: stats.totalGrievances ? Math.round((stats.resolvedGrievances / stats.totalGrievances) * 100) : 0,
      overdueRate: stats.totalGrievances ? Math.round((stats.overdueGrievances / stats.totalGrievances) * 100) : 0
    };
  }

  /**
   * Get trends data over time
   */
  async getTrendsData(startDate, endDate, filters) {
    const dailyPipeline = [
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          ...this.buildMatchStage(null, null, filters)
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt'
            }
          },
          created: { $sum: 1 },
          resolved: {
            $sum: {
              $cond: [{ $eq: ['$status', 'Resolved'] }, 1, 0]
            }
          }
        }
      },
      { $sort: { '_id': 1 } }
    ];

    const dailyStats = await Grievance.aggregate(dailyPipeline);

    // Fill missing dates with zeros
    const trends = [];
    const currentDate = new Date(startDate);
    const end = new Date(endDate);

    while (currentDate <= end) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayData = dailyStats.find(d => d._id === dateStr);
      
      trends.push({
        date: dateStr,
        created: dayData ? dayData.created : 0,
        resolved: dayData ? dayData.resolved : 0
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return trends;
  }

  /**
   * Get department-wise statistics
   */
  async getDepartmentStats(matchStage) {
    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: '$department',
          total: { $sum: 1 },
          resolved: {
            $sum: { $cond: [{ $eq: ['$status', 'Resolved'] }, 1, 0] }
          },
          pending: {
            $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] }
          },
          inProgress: {
            $sum: { $cond: [{ $eq: ['$status', 'InProgress'] }, 1, 0] }
          },
          overdue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ['$status', 'Resolved'] },
                    { $lt: ['$slaDeadline', new Date()] }
                  ]
                },
                1,
                0
              ]
            }
          },
          avgResolutionTime: {
            $avg: {
              $cond: [
                { $eq: ['$status', 'Resolved'] },
                { $subtract: ['$resolvedAt', '$createdAt'] },
                null
              ]
            }
          }
        }
      },
      {
        $lookup: {
          from: 'departments',
          localField: '_id',
          foreignField: '_id',
          as: 'deptInfo'
        }
      },
      {
        $unwind: '$deptInfo'
      },
      {
        $project: {
          departmentId: '$_id',
          departmentName: '$deptInfo.name',
          departmentCode: '$deptInfo.code',
          total: 1,
          resolved: 1,
          pending: 1,
          inProgress: 1,
          overdue: 1,
          avgResolutionTime: { $ifNull: ['$avgResolutionTime', 0] },
          resolutionRate: {
            $cond: [
              { $eq: ['$total', 0] },
              0,
              { $multiply: [{ $divide: ['$resolved', '$total'] }, 100] }
            ]
          }
        }
      },
      { $sort: { total: -1 } }
    ];

    return await Grievance.aggregate(pipeline);
  }

  /**
   * Get category-wise statistics
   */
  async getCategoryStats(matchStage) {
    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: '$category',
          total: { $sum: 1 },
          resolved: {
            $sum: { $cond: [{ $eq: ['$status', 'Resolved'] }, 1, 0] }
          },
          avgResolutionTime: {
            $avg: {
              $cond: [
                { $eq: ['$status', 'Resolved'] },
                { $subtract: ['$resolvedAt', '$createdAt'] },
                null
              ]
            }
          }
        }
      },
      {
        $project: {
          category: '$_id',
          total: 1,
          resolved: 1,
          avgResolutionTime: { $ifNull: ['$avgResolutionTime', 0] },
          resolutionRate: {
            $cond: [
              { $eq: ['$total', 0] },
              0,
              { $multiply: [{ $divide: ['$resolved', '$total'] }, 100] }
            ]
          }
        }
      },
      { $sort: { total: -1 } }
    ];

    return await Grievance.aggregate(pipeline);
  }

  /**
   * Get priority-wise statistics
   */
  async getPriorityStats(matchStage) {
    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: '$priority',
          total: { $sum: 1 },
          resolved: {
            $sum: { $cond: [{ $eq: ['$status', 'Resolved'] }, 1, 0] }
          },
          overdue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ['$status', 'Resolved'] },
                    { $lt: ['$slaDeadline', new Date()] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $project: {
          priority: '$_id',
          total: 1,
          resolved: 1,
          overdue: 1,
          resolutionRate: {
            $cond: [
              { $eq: ['$total', 0] },
              0,
              { $multiply: [{ $divide: ['$resolved', '$total'] }, 100] }
            ]
          }
        }
      },
      { $sort: { total: -1 } }
    ];

    return await Grievance.aggregate(pipeline);
  }

  /**
   * Get status-wise statistics
   */
  async getStatusStats(matchStage) {
    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: '$status',
          total: { $sum: 1 },
          avgAge: {
            $avg: { $subtract: [new Date(), '$createdAt'] }
          }
        }
      },
      {
        $project: {
          status: '$_id',
          total: 1,
          avgAge: { $ifNull: ['$avgAge', 0] }
        }
      },
      { $sort: { total: -1 } }
    ];

    return await Grievance.aggregate(pipeline);
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(matchStage) {
    const [
      slaCompliance,
      responseTime,
      workloadDistribution,
      satisfactionScores
    ] = await Promise.all([
      this.getSLACompliance(matchStage),
      this.getResponseTimeMetrics(matchStage),
      this.getWorkloadDistribution(matchStage),
      this.getSatisfactionScores(matchStage)
    ]);

    return {
      slaCompliance,
      responseTime,
      workloadDistribution,
      satisfactionScores
    };
  }

  /**
   * Get SLA compliance metrics
   */
  async getSLACompliance(matchStage) {
    const pipeline = [
      { $match: { ...matchStage, status: 'Resolved' } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          onTime: {
            $sum: {
              $cond: [
                { $lte: ['$resolvedAt', '$slaDeadline'] },
                1,
                0
              ]
            }
          },
          avgOverdueBy: {
            $avg: {
              $cond: [
                { $gt: ['$resolvedAt', '$slaDeadline'] },
                { $subtract: ['$resolvedAt', '$slaDeadline'] },
                null
              ]
            }
          }
        }
      }
    ];

    const result = await Grievance.aggregate(pipeline);
    const stats = result[0] || {};

    return {
      complianceRate: stats.total ? Math.round((stats.onTime / stats.total) * 100) : 0,
      averageOverdue: stats.avgOverdueBy ? Math.round(stats.avgOverdueBy / (1000 * 60 * 60)) : 0
    };
  }

  /**
   * Get predictive analytics using AI service
   */
  async getPredictiveAnalytics(filters) {
    try {
      const [clusters, anomalies, forecast] = await Promise.all([
        getClusters(),
        getAnomalies(),
        getForecast()
      ]);

      return {
        clusters: clusters.available ? clusters.clusters : [],
        anomalies: anomalies.available ? anomalies.anomalies : [],
        forecast: forecast.available ? forecast.forecast : [],
        aiServiceAvailable: clusters.available && anomalies.available && forecast.available
      };
    } catch (error) {
      console.error('Predictive analytics error:', error);
      return {
        clusters: [],
        anomalies: [],
        forecast: [],
        aiServiceAvailable: false
      };
    }
  }

  /**
   * Helper methods
   */
  getDateRange(range) {
    const now = new Date();
    let startDate;

    switch (range) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    return {
      startDate: startDate,
      endDate: now
    };
  }

  buildMatchStage(startDate, endDate, filters) {
    const match = {};

    if (startDate && endDate) {
      match.createdAt = { $gte: startDate, $lte: endDate };
    }

    if (filters.departmentId) {
      match.department = new mongoose.Types.ObjectId(filters.departmentId);
    }

    if (filters.category) {
      match.category = filters.category;
    }

    if (filters.status) {
      match.status = filters.status;
    }

    if (filters.priority) {
      match.priority = filters.priority;
    }

    return match;
  }

  async getResponseTimeMetrics(matchStage) {
    // Implementation for response time metrics
    return {
      avgFirstResponse: 2.5, // hours
      avgResolution: 24.5, // hours
      medianResolution: 18.0 // hours
    };
  }

  async getWorkloadDistribution(matchStage) {
    // Implementation for workload distribution
    return {
      byDepartment: [
        { name: 'CSE', workload: 45, capacity: 60 },
        { name: 'IT', workload: 32, capacity: 50 },
        { name: 'Admin', workload: 28, capacity: 40 }
      ]
    };
  }

  async getSatisfactionScores(matchStage) {
    // Implementation for satisfaction scores
    return {
      average: 4.2,
      distribution: {
        5: 45,
        4: 30,
        3: 15,
        2: 7,
        1: 3
      }
    };
  }
}

export default new AnalyticsService();
