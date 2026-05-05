import express from "express";
import AuditLog from "../models/AuditLog.js";
import { guardSuperAdmin } from "../middleware/guards.js";

const router = express.Router();

// ✅ FIX M-03: original handler had no try/catch — any DB error would throw an
// unhandled promise rejection and crash (or hang) the request. Wrapped in try/catch
// and delegated to the central error handler via next(err).
router.get("/", ...guardSuperAdmin, async (req, res, next) => {
    try {
        const filter = {};
        if (req.query.action) filter.action = req.query.action;
        if (req.query.from || req.query.to) {
            filter.timestamp = {};
            if (req.query.from) filter.timestamp.$gte = new Date(req.query.from);
            if (req.query.to) filter.timestamp.$lte = new Date(req.query.to);
        }
        const logs = await AuditLog.find(filter)
            .populate("performedBy", "name email role")
            .sort({ timestamp: -1 })
            .limit(200);
        res.json({ logs });
    } catch (err) {
        next(err);
    }
});

export default router;