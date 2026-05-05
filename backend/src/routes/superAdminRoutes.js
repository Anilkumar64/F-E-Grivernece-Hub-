import express   from "express";
import mongoose  from "mongoose";
import Grievance from "../models/Grievance.js";
import User      from "../models/User.js";
import Department from "../models/Department.js";
import GrievanceCategory from "../models/GrievanceCategory.js";
import SiteConfig from "../models/SiteConfig.js";
import AuditLog  from "../models/AuditLog.js";
import ApprovalRequest from "../models/ApprovalRequest.js";
import SecurityEvent from "../models/SecurityEvent.js";
import BackupStatus from "../models/BackupStatus.js";
import ComplianceRequest from "../models/ComplianceRequest.js";
import { verifySuperAdmin } from "../middleware/authMiddleware.js";
import { writeAuditLog }    from "../utils/audit.js";
import { delCache, getCache, setCache } from "../utils/cache.js";
import { authorizePermission } from "../middleware/rbac.js";
import { requireStepUp } from "../middleware/stepUp.js";
import crypto from "crypto";

const router = express.Router();
router.use(...verifySuperAdmin);

/* ─── Dashboard stats ─── */
router.get("/stats", async (req, res, next) => {
    try {
        const cacheKey = "superadmin:stats";
        const cached   = await getCache(cacheKey);
        if (cached) return res.json(cached);

        const [totalGrievances, pending, inProgress, resolved, escalated, totalStudents, totalAdmins, pendingAdmins] = await Promise.all([
            Grievance.countDocuments({}),
            Grievance.countDocuments({ status: "Pending" }),
            Grievance.countDocuments({ status: "InProgress" }),
            Grievance.countDocuments({ status: "Resolved" }),
            Grievance.countDocuments({ isEscalated: true }),
            User.countDocuments({ role: "student", isActive: true }),
            User.countDocuments({ role: "admin", isActive: true, isVerified: true }),
            User.countDocuments({ role: "admin", isVerified: false }),
        ]);

        // Average resolution time (hours)
        const resolvedDocs = await Grievance.find({ status: "Resolved", resolvedAt: { $ne: null } }, { createdAt: 1, resolvedAt: 1 }).lean();
        let avgResolutionTime = 0;
        if (resolvedDocs.length) {
            const totalMs = resolvedDocs.reduce((sum, g) => {
                const diff = new Date(g.resolvedAt) - new Date(g.createdAt);
                return diff > 0 ? sum + diff : sum;
            }, 0);
            avgResolutionTime = +(totalMs / resolvedDocs.length / 36e5).toFixed(2);
        }

        // SLA breaches (non-terminal, past deadline)
        const slaBreaches = await Grievance.countDocuments({
            status:      { $nin: ["Resolved", "Closed"] },
            slaDeadline: { $lt: new Date() },
        });

        // Most active department
        const deptAgg = await Grievance.aggregate([
            { $group: { _id: "$department", count: { $sum: 1 } } },
            { $sort: { count: -1 } }, { $limit: 1 },
            { $lookup: { from: "departments", localField: "_id", foreignField: "_id", as: "dept" } },
        ]);
        const mostActiveDept = deptAgg[0]?.dept?.[0]?.name || "N/A";

        const payload = {
            totalGrievances, pending, inProgress, resolved, escalated,
            totalStudents, totalAdmins, pendingAdmins,
            avgResolutionTime, slaBreaches, mostActiveDept,
        };
        await setCache(cacheKey, payload, 120); // 2-min cache
        return res.json(payload);
    } catch (err) { next(err); }
});

/* ─── Grievances by status ─── */
router.get("/grievances-by-status", async (_req, res, next) => {
    try {
        const agg = await Grievance.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }, { $sort: { count: -1 } }]);
        res.json(agg.map((r) => ({ status: r._id || "Unknown", count: r.count })));
    } catch (err) { next(err); }
});

/* ─── Grievances by department ─── */
router.get("/grievances-by-dept", async (_req, res, next) => {
    try {
        const agg = await Grievance.aggregate([
            { $group: { _id: "$department", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $lookup: { from: "departments", localField: "_id", foreignField: "_id", as: "dept" } },
        ]);
        res.json(agg.map((r) => ({ department: r.dept?.[0]?.name || r._id || "Unknown", count: r.count })));
    } catch (err) { next(err); }
});

/* ─── Grievances trend (last 30 days) ─── */
router.get("/grievances-trend", async (_req, res, next) => {
    try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const agg = await Grievance.aggregate([
            { $match: { createdAt: { $gte: thirtyDaysAgo } } },
            { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
            { $sort: { _id: 1 } },
        ]);
        res.json(agg.map((r) => ({ date: r._id, count: r.count })));
    } catch (err) { next(err); }
});

/* ─── Reports ─── */
router.get("/reports", async (req, res, next) => {
    try {
        const [totalGrievances, resolved] = await Promise.all([
            Grievance.countDocuments({}),
            Grievance.countDocuments({ status: "Resolved" }),
        ]);

        const resolvedDocs = await Grievance.find({ status: "Resolved", resolvedAt: { $ne: null } }, { createdAt: 1, resolvedAt: 1 }).lean();
        let avgResolutionTime = 0;
        if (resolvedDocs.length) {
            const ms = resolvedDocs.reduce((s, g) => s + Math.max(0, new Date(g.resolvedAt) - new Date(g.createdAt)), 0);
            avgResolutionTime = +(ms / resolvedDocs.length / 36e5).toFixed(2);
        }

        const [deptAgg, statusAgg, priorityAgg] = await Promise.all([
            Grievance.aggregate([
                { $group: { _id: "$department", count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $lookup: { from: "departments", localField: "_id", foreignField: "_id", as: "dept" } },
            ]),
            Grievance.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
            Grievance.aggregate([{ $group: { _id: "$priority", count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
        ]);

        res.json({
            summary: { totalGrievances, resolved, avgResolutionTime },
            departmentReport: deptAgg.map((r) => ({ department: r.dept?.[0]?.name || "Unknown", count: r.count })),
            statusReport:     statusAgg.map((r)  => ({ status:     r._id || "Unknown", count: r.count })),
            priorityReport:   priorityAgg.map((r) => ({ priority:  r._id || "Unknown", count: r.count })),
        });
    } catch (err) { next(err); }
});

router.get("/reports/filtered", authorizePermission("reports.read"), async (req, res, next) => {
    try {
        const { status, priority, department, from, to } = req.query;
        const query = {};
        if (status) query.status = status;
        if (priority) query.priority = priority;
        if (department) query.department = department;
        if (from || to) {
            query.createdAt = {};
            if (from) query.createdAt.$gte = new Date(from);
            if (to) query.createdAt.$lte = new Date(to);
        }
        const grievances = await Grievance.find(query)
            .populate("department", "name code")
            .populate("createdBy", "name email role")
            .sort({ createdAt: -1 })
            .limit(500);
        return res.json({ count: grievances.length, grievances });
    } catch (err) { next(err); }
});

/* ─── Departments ─── */
router.get("/departments", async (_req, res, next) => {
    try {
        const departments = await Department.find().populate("headAdmin", "name email").sort({ name: 1 });
        res.json({ departments });
    } catch (err) { next(err); }
});

router.post("/departments", async (req, res, next) => {
    try {
        const { name, code, description } = req.body;
        if (!name || !code) return res.status(400).json({ message: "Name and code are required" });

        const dept = await Department.create({ name, code: code.toUpperCase(), description });
        await delCache("departments:*");
        await writeAuditLog(req, "DEPARTMENT_CREATED", "Department", dept._id);
        res.status(201).json({ message: "Department created", department: dept });
    } catch (err) { next(err); }
});

router.patch("/departments/:id", async (req, res, next) => {
    try {
        const allowed = ["name", "description", "headAdmin", "isActive"];
        const update  = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));
        const dept    = await Department.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
        if (!dept) return res.status(404).json({ message: "Department not found" });
        await delCache("departments:*");
        await writeAuditLog(req, "DEPARTMENT_UPDATED", "Department", dept._id, update);
        res.json({ message: "Department updated", department: dept });
    } catch (err) { next(err); }
});

router.delete("/departments/:id", async (req, res, next) => {
    try {
        const inUse = await Grievance.exists({ department: req.params.id });
        if (inUse) return res.status(409).json({ message: "Department has grievances and cannot be deleted. Deactivate it instead." });

        const dept = await Department.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
        if (!dept) return res.status(404).json({ message: "Department not found" });
        await delCache("departments:*");
        await writeAuditLog(req, "DEPARTMENT_DEACTIVATED", "Department", dept._id);
        res.json({ message: "Department deactivated", department: dept });
    } catch (err) { next(err); }
});

/* ─── Site config ─── */
const getOrCreateConfig = async () => {
    let c = await SiteConfig.findOne({ key: "global" });
    if (!c) c = await SiteConfig.create({ key: "global" });
    return c;
};

router.get("/site-config", async (_req, res, next) => {
    try { res.json(await getOrCreateConfig()); } catch (err) { next(err); }
});

router.put("/site-config", async (req, res, next) => {
    try {
        const config = await getOrCreateConfig();
        const { landing, adminBanner, superAdminBanner } = req.body;
        if (landing)          config.landing          = { ...config.landing.toObject(),          ...landing };
        if (adminBanner)      config.adminBanner      = { ...config.adminBanner.toObject(),      ...adminBanner };
        if (superAdminBanner) config.superAdminBanner = { ...config.superAdminBanner.toObject(), ...superAdminBanner };
        await config.save();
        res.json(config);
    } catch (err) { next(err); }
});

router.put("/settings/security", authorizePermission("settings.update"), async (req, res, next) => {
    try {
        const config = await getOrCreateConfig();
        const { maxLoginAttempts, lockoutMinutes, stepUpWindowMinutes } = req.body;
        config.security = {
            ...config.security.toObject(),
            ...(Number.isFinite(maxLoginAttempts) ? { maxLoginAttempts } : {}),
            ...(Number.isFinite(lockoutMinutes) ? { lockoutMinutes } : {}),
            ...(Number.isFinite(stepUpWindowMinutes) ? { stepUpWindowMinutes } : {}),
        };
        await config.save();
        await writeAuditLog(req, "SECURITY_SETTINGS_UPDATED", "SiteConfig", config._id, req.body);
        return res.json({ message: "Security settings updated", security: config.security });
    } catch (err) { next(err); }
});

router.put("/settings/audit", authorizePermission("settings.update"), async (req, res, next) => {
    try {
        const config = await getOrCreateConfig();
        const { retentionDays, integrityChainEnabled } = req.body;
        config.audit = {
            ...config.audit.toObject(),
            ...(Number.isFinite(retentionDays) ? { retentionDays } : {}),
            ...(typeof integrityChainEnabled === "boolean" ? { integrityChainEnabled } : {}),
        };
        await config.save();
        await writeAuditLog(req, "AUDIT_SETTINGS_UPDATED", "SiteConfig", config._id, req.body);
        return res.json({ message: "Audit settings updated", audit: config.audit });
    } catch (err) { next(err); }
});

router.post("/audit/cleanup", authorizePermission("audit.cleanup"), requireStepUp(), async (req, res, next) => {
    try {
        const result = await AuditLog.deleteMany({ retentionUntil: { $lt: new Date() } });
        await writeAuditLog(req, "AUDIT_RETENTION_CLEANUP", "AuditLog", null, { deletedCount: result.deletedCount });
        return res.json({ message: "Audit cleanup completed", deletedCount: result.deletedCount });
    } catch (err) { next(err); }
});

router.get("/audit/verify-integrity", authorizePermission("audit.verify"), async (req, res, next) => {
    try {
        const logs = await AuditLog.find({}).sort({ timestamp: 1 }).lean();
        let previousHash = null;
        const brokenAt = [];
        for (const log of logs) {
            const payload = JSON.stringify({
                action: log.action,
                performedBy: log.performedBy?.toString() || null,
                targetEntity: log.targetEntity,
                targetId: log.targetId?.toString() || null,
                metadata: log.metadata || {},
                ipAddress: log.ipAddress || "",
                previousHash,
            });
            const expected = crypto.createHash("sha256").update(payload).digest("hex");
            if (log.hash !== expected || log.previousHash !== previousHash) {
                brokenAt.push(log._id);
            }
            previousHash = log.hash;
        }
        return res.json({ total: logs.length, valid: brokenAt.length === 0, brokenAt });
    } catch (err) { next(err); }
});

/* ─── User lifecycle management (students/admins) ─── */
router.get("/users", authorizePermission("users.read"), async (req, res, next) => {
    try {
        const { role, isActive, q, page = 1, limit = 20 } = req.query;
        const query = {};
        if (role) query.role = role;
        if (typeof isActive !== "undefined") query.isActive = isActive === "true";
        if (q) {
            query.$or = [
                { name: { $regex: q, $options: "i" } },
                { email: { $regex: q, $options: "i" } },
                { studentId: { $regex: q, $options: "i" } },
                { staffId: { $regex: q, $options: "i" } },
            ];
        }
        const skip = (Number(page) - 1) * Number(limit);
        const [users, total] = await Promise.all([
            User.find(query)
                .select("-password -refreshTokenHash -resetToken -resetTokenExpire")
                .populate("department", "name code")
                .populate("course", "name code")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit)),
            User.countDocuments(query),
        ]);
        return res.json({ total, page: Number(page), limit: Number(limit), users });
    } catch (err) { next(err); }
});

router.patch("/users/:id/status", authorizePermission("users.manage"), requireStepUp(), async (req, res, next) => {
    try {
        const { isActive } = req.body;
        if (typeof isActive !== "boolean") return res.status(400).json({ message: "isActive boolean is required" });
        const user = await User.findByIdAndUpdate(req.params.id, { isActive }, { new: true })
            .select("-password -refreshTokenHash -resetToken -resetTokenExpire")
            .populate("department", "name code");
        if (!user) return res.status(404).json({ message: "User not found" });
        await writeAuditLog(req, "USER_STATUS_UPDATED", "User", user._id, { isActive });
        return res.json({ message: "User status updated", user });
    } catch (err) { next(err); }
});

router.post("/users/:id/force-logout", authorizePermission("users.manage"), requireStepUp(), async (req, res, next) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { refreshTokenHash: null, activeSessions: [] },
            { new: true }
        ).select("-password -refreshTokenHash -resetToken -resetTokenExpire");
        if (!user) return res.status(404).json({ message: "User not found" });
        await SecurityEvent.create({
            type: "force_logout",
            severity: "high",
            user: user._id,
            message: `All sessions revoked for ${user.email}`,
            metadata: { actorId: req.userId },
            createdBy: req.userId,
        });
        await writeAuditLog(req, "USER_FORCE_LOGOUT", "User", user._id);
        return res.json({ message: "All sessions revoked", user });
    } catch (err) { next(err); }
});

router.post("/users/:id/unlock", authorizePermission("users.manage"), async (req, res, next) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { lockUntil: null, loginAttempts: 0, isActive: true },
            { new: true }
        ).select("-password -refreshTokenHash -resetToken -resetTokenExpire");
        if (!user) return res.status(404).json({ message: "User not found" });
        await SecurityEvent.create({
            type: "unusual_activity",
            severity: "medium",
            user: user._id,
            message: `User ${user.email} was manually unlocked`,
            metadata: { actorId: req.userId },
            createdBy: req.userId,
        });
        await writeAuditLog(req, "USER_UNLOCKED", "User", user._id);
        return res.json({ message: "User unlocked", user });
    } catch (err) { next(err); }
});

router.patch("/users/:id/reset-password", authorizePermission("users.manage"), requireStepUp(), async (req, res, next) => {
    try {
        const temporaryPassword = req.body.password || crypto.randomBytes(8).toString("base64url");
        const user = await User.findById(req.params.id).select("+password");
        if (!user) return res.status(404).json({ message: "User not found" });
        user.password = temporaryPassword;
        user.refreshTokenHash = null;
        await user.save();
        await writeAuditLog(req, "USER_PASSWORD_RESET", "User", user._id);
        return res.json({ message: "Password reset", temporaryPassword });
    } catch (err) { next(err); }
});

router.patch("/users/:id/assignments", authorizePermission("users.manage"), async (req, res, next) => {
    try {
        const allowed = ["department", "course"];
        const update = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
        const user = await User.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true })
            .select("-password -refreshTokenHash -resetToken -resetTokenExpire")
            .populate("department", "name code")
            .populate("course", "name code");
        if (!user) return res.status(404).json({ message: "User not found" });
        await writeAuditLog(req, "USER_ASSIGNMENT_UPDATED", "User", user._id, update);
        return res.json({ message: "User assignment updated", user });
    } catch (err) { next(err); }
});

/* ─── Permission templates and assignment ─── */
router.get("/rbac/templates", authorizePermission("settings.update"), async (_req, res, next) => {
    try {
        const config = await getOrCreateConfig();
        return res.json({ templates: config.roleTemplates || [] });
    } catch (err) { next(err); }
});

router.put("/rbac/templates", authorizePermission("settings.update"), async (req, res, next) => {
    try {
        const templates = Array.isArray(req.body?.templates) ? req.body.templates : [];
        const config = await getOrCreateConfig();
        config.roleTemplates = templates;
        await config.save();
        await writeAuditLog(req, "RBAC_TEMPLATES_UPDATED", "SiteConfig", config._id, { count: templates.length });
        return res.json({ message: "RBAC templates updated", templates: config.roleTemplates });
    } catch (err) { next(err); }
});

router.patch("/rbac/users/:id/permissions", authorizePermission("users.manage"), async (req, res, next) => {
    try {
        const permissions = Array.isArray(req.body?.permissions) ? req.body.permissions : [];
        const user = await User.findByIdAndUpdate(req.params.id, { permissions }, { new: true })
            .select("-password -refreshTokenHash -resetToken -resetTokenExpire");
        if (!user) return res.status(404).json({ message: "User not found" });
        await writeAuditLog(req, "USER_PERMISSIONS_UPDATED", "User", user._id, { permissions });
        return res.json({ message: "Permissions updated", user });
    } catch (err) { next(err); }
});

/* ─── 4-eyes approval workflow ─── */
router.post("/approvals", authorizePermission("users.manage"), async (req, res, next) => {
    try {
        const { actionType, targetEntity, targetId = null, reason, payload = {} } = req.body;
        if (!actionType || !targetEntity || !reason) {
            return res.status(400).json({ message: "actionType, targetEntity and reason are required" });
        }
        const request = await ApprovalRequest.create({
            actionType,
            targetEntity,
            targetId,
            reason,
            payload,
            requestedBy: req.userId,
        });
        await writeAuditLog(req, "APPROVAL_REQUEST_CREATED", "ApprovalRequest", request._id, { actionType, targetEntity });
        return res.status(201).json({ message: "Approval request created", request });
    } catch (err) { next(err); }
});

router.get("/approvals", authorizePermission("users.manage"), async (req, res, next) => {
    try {
        const status = req.query.status || "pending";
        const requests = await ApprovalRequest.find({ status })
            .populate("requestedBy", "name email role")
            .populate("approvedBy", "name email role")
            .sort({ createdAt: -1 });
        return res.json({ requests });
    } catch (err) { next(err); }
});

router.patch("/approvals/:id/decision", authorizePermission("users.manage"), requireStepUp(), async (req, res, next) => {
    try {
        const { decision, decisionNote = "" } = req.body;
        if (!["approved", "rejected"].includes(decision)) return res.status(400).json({ message: "Invalid decision" });
        const request = await ApprovalRequest.findById(req.params.id);
        if (!request) return res.status(404).json({ message: "Approval request not found" });
        if (request.requestedBy.toString() === req.userId) {
            return res.status(400).json({ message: "Requester cannot approve own request" });
        }
        request.status = decision;
        request.approvedBy = req.userId;
        request.decisionNote = decisionNote;
        await request.save();
        await writeAuditLog(req, "APPROVAL_REQUEST_DECIDED", "ApprovalRequest", request._id, { decision });
        return res.json({ message: "Decision recorded", request });
    } catch (err) { next(err); }
});

/* ─── Incident center ─── */
router.get("/incidents", authorizePermission("users.manage"), async (req, res, next) => {
    try {
        const status = req.query.status;
        const query = status ? { status } : {};
        const incidents = await SecurityEvent.find(query)
            .populate("user", "name email role isActive lockUntil")
            .sort({ createdAt: -1 })
            .limit(200);
        return res.json({ incidents });
    } catch (err) { next(err); }
});

router.post("/incidents", authorizePermission("users.manage"), async (req, res, next) => {
    try {
        const { type, severity = "medium", user = null, message, metadata = {} } = req.body;
        if (!type || !message) return res.status(400).json({ message: "type and message are required" });
        const incident = await SecurityEvent.create({ type, severity, user, message, metadata, createdBy: req.userId });
        await writeAuditLog(req, "SECURITY_INCIDENT_CREATED", "SecurityEvent", incident._id, { type, severity });
        return res.status(201).json({ message: "Incident created", incident });
    } catch (err) { next(err); }
});

router.patch("/incidents/:id/status", authorizePermission("users.manage"), async (req, res, next) => {
    try {
        const { status } = req.body;
        if (!["open", "investigating", "resolved"].includes(status)) return res.status(400).json({ message: "Invalid status" });
        const incident = await SecurityEvent.findByIdAndUpdate(req.params.id, { status }, { new: true });
        if (!incident) return res.status(404).json({ message: "Incident not found" });
        await writeAuditLog(req, "SECURITY_INCIDENT_STATUS_UPDATED", "SecurityEvent", incident._id, { status });
        return res.json({ message: "Incident updated", incident });
    } catch (err) { next(err); }
});

/* ─── Session/device management ─── */
router.get("/sessions", authorizePermission("users.read"), async (_req, res, next) => {
    try {
        const users = await User.find({ role: { $in: ["admin", "superadmin"] } })
            .select("name email role activeSessions")
            .sort({ updatedAt: -1 });
        return res.json({
            sessions: users.flatMap((u) =>
                (u.activeSessions || []).map((s) => ({
                    userId: u._id,
                    name: u.name,
                    email: u.email,
                    role: u.role,
                    ...s,
                }))
            ),
        });
    } catch (err) { next(err); }
});

/* ─── Backup and compliance center ─── */
router.get("/backup-status", authorizePermission("settings.update"), async (_req, res, next) => {
    try {
        let status = await BackupStatus.findOne({ environment: "production" });
        if (!status) {
            status = await BackupStatus.create({
                environment: "production",
                status: "healthy",
                lastSuccessfulBackupAt: new Date(),
                nextScheduledBackupAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            });
        }
        return res.json({ status });
    } catch (err) { next(err); }
});

router.put("/backup-status", authorizePermission("settings.update"), async (req, res, next) => {
    try {
        const update = req.body || {};
        const status = await BackupStatus.findOneAndUpdate(
            { environment: "production" },
            update,
            { new: true, upsert: true, runValidators: true }
        );
        await writeAuditLog(req, "BACKUP_STATUS_UPDATED", "BackupStatus", status._id, update);
        return res.json({ message: "Backup status updated", status });
    } catch (err) { next(err); }
});

router.post("/compliance-requests", authorizePermission("users.manage"), async (req, res, next) => {
    try {
        const { requestType, subjectEmail, reason } = req.body;
        if (!requestType || !subjectEmail || !reason) {
            return res.status(400).json({ message: "requestType, subjectEmail and reason are required" });
        }
        const subjectUser = await User.findOne({ email: subjectEmail.toLowerCase().trim() }).select("_id");
        const request = await ComplianceRequest.create({
            requestType,
            subjectEmail,
            subjectUser: subjectUser?._id || null,
            reason,
            requestedBy: req.userId,
        });
        await writeAuditLog(req, "COMPLIANCE_REQUEST_CREATED", "ComplianceRequest", request._id, { requestType, subjectEmail });
        return res.status(201).json({ message: "Compliance request created", request });
    } catch (err) { next(err); }
});

router.get("/compliance-requests", authorizePermission("users.manage"), async (_req, res, next) => {
    try {
        const requests = await ComplianceRequest.find({})
            .populate("requestedBy", "name email role")
            .populate("completedBy", "name email role")
            .sort({ createdAt: -1 });
        return res.json({ requests });
    } catch (err) { next(err); }
});

router.patch("/compliance-requests/:id", authorizePermission("users.manage"), async (req, res, next) => {
    try {
        const { status, resultNote = "" } = req.body;
        if (!["open", "in_progress", "completed", "rejected"].includes(status)) {
            return res.status(400).json({ message: "Invalid status" });
        }
        const request = await ComplianceRequest.findById(req.params.id);
        if (!request) return res.status(404).json({ message: "Compliance request not found" });
        request.status = status;
        request.resultNote = resultNote;
        if (status === "completed" || status === "rejected") request.completedBy = req.userId;
        await request.save();
        await writeAuditLog(req, "COMPLIANCE_REQUEST_UPDATED", "ComplianceRequest", request._id, { status });
        return res.json({ message: "Compliance request updated", request });
    } catch (err) { next(err); }
});

/* ─── SLA policy + notification policy center ─── */
router.put("/settings/sla-matrix", authorizePermission("settings.update"), async (req, res, next) => {
    try {
        const matrix = Array.isArray(req.body?.slaMatrix) ? req.body.slaMatrix : [];
        const config = await getOrCreateConfig();
        config.slaMatrix = matrix;
        await config.save();
        await writeAuditLog(req, "SLA_MATRIX_UPDATED", "SiteConfig", config._id, { count: matrix.length });
        return res.json({ message: "SLA matrix updated", slaMatrix: config.slaMatrix });
    } catch (err) { next(err); }
});

router.put("/settings/notifications", authorizePermission("settings.update"), async (req, res, next) => {
    try {
        const config = await getOrCreateConfig();
        const { notificationPolicies = {}, messageTemplates = {} } = req.body;
        config.notificationPolicies = {
            ...config.notificationPolicies.toObject(),
            ...notificationPolicies,
        };
        config.messageTemplates = {
            ...config.messageTemplates.toObject(),
            ...messageTemplates,
        };
        await config.save();
        await writeAuditLog(req, "NOTIFICATION_POLICY_UPDATED", "SiteConfig", config._id, req.body);
        return res.json({
            message: "Notification policy updated",
            notificationPolicies: config.notificationPolicies,
            messageTemplates: config.messageTemplates,
        });
    } catch (err) { next(err); }
});

/* ─── Operational dashboard health ─── */
router.get("/operational-health", authorizePermission("reports.read"), async (_req, res, next) => {
    try {
        const now = new Date();
        const backlog = await Grievance.countDocuments({ status: { $in: ["Pending", "InProgress", "Escalated"] } });
        const breachedSlas = await Grievance.countDocuments({ status: { $nin: ["Resolved", "Closed"] }, slaDeadline: { $lt: now } });
        const agg = await Grievance.aggregate([
            { $match: { status: "Resolved", resolvedAt: { $ne: null } } },
            {
                $project: {
                    firstResponseHours: { $divide: [{ $subtract: ["$updatedAt", "$createdAt"] }, 36e5] },
                    resolutionHours: { $divide: [{ $subtract: ["$resolvedAt", "$createdAt"] }, 36e5] },
                },
            },
        ]);
        const avgFirstResponse = agg.length ? +(agg.reduce((s, i) => s + Math.max(0, i.firstResponseHours), 0) / agg.length).toFixed(2) : 0;
        const avgResolution = agg.length ? +(agg.reduce((s, i) => s + Math.max(0, i.resolutionHours), 0) / agg.length).toFixed(2) : 0;

        const workload = await Grievance.aggregate([
            { $match: { status: { $in: ["Pending", "InProgress", "Escalated"] }, assignedTo: { $ne: null } } },
            { $group: { _id: "$assignedTo", activeCases: { $sum: 1 } } },
            { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "admin" } },
            { $project: { _id: 1, activeCases: 1, name: { $arrayElemAt: ["$admin.name", 0] }, email: { $arrayElemAt: ["$admin.email", 0] } } },
            { $sort: { activeCases: -1 } },
        ]);

        return res.json({ backlog, avgFirstResponse, avgResolution, breachedSlas, workload });
    } catch (err) { next(err); }
});

export default router;
