import express   from "express";
import mongoose  from "mongoose";
import Grievance from "../models/Grievance.js";
import User      from "../models/User.js";
import Department from "../models/Department.js";
import GrievanceCategory from "../models/GrievanceCategory.js";
import SiteConfig from "../models/SiteConfig.js";
import AuditLog  from "../models/AuditLog.js";
import { verifySuperAdmin } from "../middleware/authMiddleware.js";
import { writeAuditLog }    from "../utils/audit.js";
import { delCache, getCache, setCache } from "../utils/cache.js";

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

export default router;
