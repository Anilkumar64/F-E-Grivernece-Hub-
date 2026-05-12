import mongoose from "mongoose";
import crypto from "crypto";

export const AUDIT_RETENTION_DAYS = 21;

const auditLogSchema = new mongoose.Schema(
    {
        action: { type: String, required: true, index: true },
        performedBy: {
            type: mongoose.Schema.Types.ObjectId,
            refPath: "performedByModel",
            default: null,
            index: true,
        },
        performedByModel: {
            type: String,
            enum: ["User", "Admin", "SuperAdmin"],
            default: null,
            index: true,
        },
        actor: {
            name: { type: String, default: "" },
            email: { type: String, default: "" },
            role: { type: String, enum: ["student", "admin", "superadmin", ""], default: "" },
        },
        targetEntity: { type: String, required: true, index: true },
        targetId: { type: mongoose.Schema.Types.ObjectId, default: null },
        metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
        ipAddress: { type: String, default: "" },
        userAgent: { type: String, default: "" },
        sessionId: { type: String, default: "" },
        timestamp: { type: Date, default: Date.now },
        previousHash: { type: String, default: null, index: true },
        hash: { type: String, default: "", index: true },
        retentionUntil: { type: Date },
        compliance: {
            category: { type: String, enum: ['GDPR', 'SOX', 'HIPAA', 'FERPA', 'INTERNAL'] },
            severity: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'MEDIUM' },
            requiresReview: { type: Boolean, default: false },
            reviewedAt: { type: Date },
            reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
        },
        risk: {
            level: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'LOW' },
            factors: [String],
            score: { type: Number, min: 0, max: 100, default: 0 }
        }
    },
    {
        versionKey: false,
        timestamps: true
    }
);

// Indexes for efficient querying
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ performedBy: 1, performedByModel: 1, timestamp: -1 });
auditLogSchema.index({ "actor.role": 1, timestamp: -1 });
auditLogSchema.index({ "actor.email": 1, timestamp: -1 });
auditLogSchema.index({ targetEntity: 1, targetId: 1, timestamp: -1 });
auditLogSchema.index({ 'compliance.category': 1, timestamp: -1 });
auditLogSchema.index({ 'risk.level': 1, timestamp: -1 });
auditLogSchema.index({ retentionUntil: 1 }, { expireAfterSeconds: 0 });

// Pre-validate middleware for hash generation, actor snapshots, and retention.
auditLogSchema.pre('validate', async function (next) {
    if (!this.performedByModel && this.actor?.role) {
        const modelByRole = { student: "User", admin: "Admin", superadmin: "SuperAdmin" };
        this.performedByModel = modelByRole[this.actor.role] || null;
    }

    // Generate hash for immutability
    const hashData = {
        action: this.action,
        performedBy: this.performedBy,
        performedByModel: this.performedByModel,
        actor: this.actor,
        targetEntity: this.targetEntity,
        targetId: this.targetId,
        metadata: this.metadata,
        timestamp: this.timestamp,
        previousHash: this.previousHash
    };

    this.hash = crypto
        .createHash('sha256')
        .update(JSON.stringify(hashData))
        .digest('hex');

    // Set retention period based on compliance requirements
    if (!this.retentionUntil) {
        const retentionDays = this.getRetentionDays();
        this.retentionUntil = new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000);
    }

    // Assess risk level
    if (!this.risk.score) {
        this.risk = this.assessRisk();
    }

    next();
});

// Instance methods
auditLogSchema.methods.getRetentionDays = function () {
    return AUDIT_RETENTION_DAYS;
};

auditLogSchema.methods.assessRisk = function () {
    const highRiskActions = [
        'DELETE', 'PERMANENT_DELETE', 'ESCALATE', 'BULK_EXPORT',
        'CHANGE_PERMISSIONS', 'RESET_PASSWORD', 'IMPERSONATE',
        'ACCESS_SENSITIVE_DATA', 'MODIFY_COMPLIANCE_SETTINGS'
    ];

    const criticalEntities = ['User', 'AuditLog', 'SystemSettings', 'ComplianceReport'];

    let score = 0;
    const factors = [];

    // Action-based risk
    if (highRiskActions.includes(this.action)) {
        score += 40;
        factors.push('high_risk_action');
    }

    // Entity-based risk
    if (criticalEntities.includes(this.targetEntity)) {
        score += 30;
        factors.push('critical_entity');
    }

    // Time-based risk (off-hours access)
    const hour = new Date(this.timestamp).getHours();
    if (hour < 6 || hour > 22) {
        score += 20;
        factors.push('off_hours_access');
    }

    // IP-based risk (if different from usual)
    if (this.metadata?.unusualIP) {
        score += 15;
        factors.push('unusual_ip');
    }

    // Bulk operations
    if (this.metadata?.bulkOperation) {
        score += 25;
        factors.push('bulk_operation');
    }

    let level = 'LOW';
    if (score >= 70) level = 'CRITICAL';
    else if (score >= 50) level = 'HIGH';
    else if (score >= 30) level = 'MEDIUM';

    return { level, factors, score };
};

auditLogSchema.methods.verifyIntegrity = async function () {
    const hashData = {
        action: this.action,
        performedBy: this.performedBy,
        performedByModel: this.performedByModel,
        actor: this.actor,
        targetEntity: this.targetEntity,
        targetId: this.targetId,
        metadata: this.metadata,
        timestamp: this.timestamp,
        previousHash: this.previousHash
    };

    const computedHash = crypto
        .createHash('sha256')
        .update(JSON.stringify(hashData))
        .digest('hex');

    return this.hash === computedHash;
};

// Static methods
auditLogSchema.statics.findByUser = function (userId, options = {}) {
    const { limit = 100, skip = 0, startDate, endDate, action } = options;

    const query = { performedBy: userId };
    if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) query.timestamp.$gte = startDate;
        if (endDate) query.timestamp.$lte = endDate;
    }
    if (action) query.action = action;

    return this.find(query)
        .sort({ timestamp: -1 })
        .limit(limit)
        .skip(skip)
        .populate('performedBy', 'name email');
};

auditLogSchema.statics.findByEntity = function (entity, entityId, options = {}) {
    const { limit = 100, skip = 0, startDate, endDate } = options;

    const query = { targetEntity: entity };
    if (entityId) query.targetId = entityId;
    if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) query.timestamp.$gte = startDate;
        if (endDate) query.timestamp.$lte = endDate;
    }

    return this.find(query)
        .sort({ timestamp: -1 })
        .limit(limit)
        .skip(skip)
        .populate('performedBy', 'name email');
};

auditLogSchema.statics.getComplianceReport = function (category, startDate, endDate) {
    const query = { 'compliance.category': category };
    if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) query.timestamp.$gte = startDate;
        if (endDate) query.timestamp.$lte = endDate;
    }

    return this.aggregate([
        { $match: query },
        {
            $group: {
                _id: '$action',
                count: { $sum: 1 },
                uniqueUsers: { $addToSet: '$performedBy' },
                riskDistribution: {
                    $push: '$risk.level'
                }
            }
        },
        {
            $project: {
                action: '$_id',
                count: 1,
                uniqueUserCount: { $size: '$uniqueUsers' },
                riskBreakdown: {
                    $reduce: {
                        input: '$riskDistribution',
                        initialValue: { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 },
                        in: {
                            $mergeObjects: [
                                '$$value',
                                {
                                    $arrayToObject: [
                                        [{
                                            k: '$$this', v: {
                                                $add: [
                                                    { $ifNull: [{ $getField: { field: '$$this', input: '$$value' } }, 0] },
                                                    1
                                                ]
                                            }
                                        }]
                                    ]
                                }
                            ]
                        }
                    }
                }
            }
        },
        { $sort: { count: -1 } }
    ]);
};

auditLogSchema.statics.getRiskSummary = function (startDate, endDate) {
    const query = {};
    if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) query.timestamp.$gte = startDate;
        if (endDate) query.timestamp.$lte = endDate;
    }

    return this.aggregate([
        { $match: query },
        {
            $group: {
                _id: '$risk.level',
                count: { $sum: 1 },
                uniqueUsers: { $addToSet: '$performedBy' },
                topActions: { $push: '$action' }
            }
        },
        {
            $project: {
                riskLevel: '$_id',
                count: 1,
                uniqueUserCount: { $size: '$uniqueUsers' },
                topActions: {
                    $slice: [
                        { $reverseArray: { $objectToArray: { $size: 1, data: '$topActions' } } },
                        5
                    ]
                }
            }
        },
        { $sort: { count: -1 } }
    ]);
};

auditLogSchema.statics.verifyChainIntegrity = async function (startDate, endDate) {
    const query = {};
    if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) query.timestamp.$gte = startDate;
        if (endDate) query.timestamp.$lte = endDate;
    }

    const logs = await this.find(query).sort({ timestamp: 1 });
    const issues = [];

    for (let i = 0; i < logs.length; i++) {
        const log = logs[i];
        const isValid = await log.verifyIntegrity();

        if (!isValid) {
            issues.push({
                logId: log._id,
                timestamp: log.timestamp,
                action: log.action,
                issue: 'Hash verification failed'
            });
        }

        // Check chain integrity
        if (i > 0 && log.previousHash !== logs[i - 1].hash) {
            issues.push({
                logId: log._id,
                timestamp: log.timestamp,
                action: log.action,
                issue: 'Chain integrity broken'
            });
        }
    }

    return {
        totalLogs: logs.length,
        verifiedLogs: logs.length - issues.length,
        issues,
        integrityPercentage: ((logs.length - issues.length) / logs.length * 100).toFixed(2)
    };
};

export default mongoose.model("AuditLog", auditLogSchema);
