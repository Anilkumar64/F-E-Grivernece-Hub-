import express from "express";
import AuditLog from "../models/AuditLog.js";
import { authenticate, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", authenticate, authorize("superadmin"), async (req, res) => {
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
});

export default router;
