import express from "express";
import AuditLog from "../models/AuditLog.js";
import User from "../models/User.js";
import Admin from "../models/Admin.js";
import SuperAdmin from "../models/SuperAdmin.js";
import { guardSuperAdmin } from "../middleware/guards.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { writeAuditLog } from "../utils/audit.js";

const router = express.Router();

const ACTION_CATEGORIES = {
    AUTH: ["LOGIN", "LOGOUT", "STUDENT_REGISTERED", "ADMIN_SELF_REGISTERED"],
    GRIEVANCE: [
        "GRIEVANCE_CREATED", "GRIEVANCE_STATUS_CHANGED", "GRIEVANCE_ASSIGNED",
        "GRIEVANCE_PRIORITY_CHANGED", "GRIEVANCE_COMMENT_ADDED", "GRIEVANCE_FEEDBACK_SUBMITTED",
        "GRIEVANCE_REOPEN_REQUESTED", "GRIEVANCE_REOPEN_DECISION", "GRIEVANCE_EVIDENCE_ADDED",
        "GRIEVANCE_ESCALATED",
    ],
    ADMIN: [
        "ADMIN_CREATED", "ADMIN_APPROVED", "ADMIN_REJECTED", "ADMIN_UPDATED",
        "ADMIN_PASSWORD_RESET", "ADMIN_DEACTIVATED",
    ],
    SYSTEM: [
        "PASSWORD_RESET", "CATEGORY_CREATED", "CATEGORY_UPDATED", "CATEGORY_DELETED",
        "DEPARTMENT_CREATED", "DEPARTMENT_UPDATED", "DEPARTMENT_DEACTIVATED",
        "COURSE_CREATED", "COURSE_DELETED", "PROFILE_PHOTO_UPDATED",
    ],
    NAVIGATION: ["PAGE_VISIT"],
};

router.get("/categories", ...guardSuperAdmin, (_req, res) => {
    res.json({ categories: ACTION_CATEGORIES });
});

/* ── GET / — list audit logs (superadmin only) ── */
router.get("/", ...guardSuperAdmin, async (req, res, next) => {
    try {
        const { action, from, to, search, role, category, page = "1", limit = "50" } = req.query;
        const filter = {};

        if (action) filter.action = action;

        if (category && ACTION_CATEGORIES[category]) {
            filter.action = { $in: ACTION_CATEGORIES[category] };
        }

        if (from || to) {
            filter.timestamp = {};
            if (from) filter.timestamp.$gte = new Date(from);
            if (to) {
                const toDate = new Date(to);
                toDate.setHours(23, 59, 59, 999);
                filter.timestamp.$lte = toDate;
            }
        }

        if (search || role) {
            const accountQuery = {};
            if (search) {
                accountQuery.$or = [
                    { name: { $regex: search, $options: "i" } },
                    { email: { $regex: search, $options: "i" } },
                ];
            }

            const modelEntries = [
                { role: "student", model: User },
                { role: "admin", model: Admin },
                { role: "superadmin", model: SuperAdmin },
            ].filter((entry) => !role || entry.role === role);

            const accountMatches = await Promise.all(
                modelEntries.map(async ({ role: accountRole, model }) => {
                    const accounts = await model.find(accountQuery).select("_id").lean();
                    return accounts.map((account) => ({
                        performedBy: account._id,
                        performedByModel: accountRole === "student" ? "User" : accountRole === "admin" ? "Admin" : "SuperAdmin",
                    }));
                })
            );
            const actorFilters = accountMatches.flat();

            filter.$or = [
                ...actorFilters,
                ...(search ? [
                    { "actor.name": { $regex: search, $options: "i" } },
                    { "actor.email": { $regex: search, $options: "i" } },
                ] : []),
                ...(role ? [{ "actor.role": role }] : []),
            ];
        }

        const pageNum = Math.max(1, parseInt(page, 10));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
        const skip = (pageNum - 1) * limitNum;

        const [logs, total] = await Promise.all([
            AuditLog.find(filter)
                .populate("performedBy", "name email role")
                .sort({ timestamp: -1 })
                .skip(skip)
                .limit(limitNum),
            AuditLog.countDocuments(filter),
        ]);

        res.json({ logs, total, page: pageNum, limit: limitNum });
    } catch (err) {
        next(err);
    }
});

/* ── POST /activity — track page navigation (any authenticated user) ── */
router.post("/activity", authenticate, async (req, res, next) => {
    try {
        const { path } = req.body;
        if (!path || typeof path !== "string") return res.status(400).json({ message: "Path is required" });

        await writeAuditLog(
            req,
            "PAGE_VISIT",
            "Page",
            null,
            {
                path: path.slice(0, 200),
                userAgent: (req.headers["user-agent"] || "").slice(0, 300),
            }
        );

        res.status(204).end();
    } catch (err) {
        next(err);
    }
});

export default router;
