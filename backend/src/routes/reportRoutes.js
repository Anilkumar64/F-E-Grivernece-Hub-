import express from "express";
import { Parser } from "json2csv";
import Grievance from "../models/Grievance.js";
import { authenticate, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/grievances.csv", authenticate, authorize("superadmin"), async (req, res) => {
    const filter = {};
    if (req.query.from || req.query.to) {
        filter.createdAt = {};
        if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
        if (req.query.to) filter.createdAt.$lte = new Date(req.query.to);
    }
    const grievances = await Grievance.find(filter)
        .populate("submittedBy", "name email studentId")
        .populate("assignedTo", "name email staffId")
        .populate("department", "name code")
        .populate("category", "name")
        .lean();
    const rows = grievances.map((g) => ({
        grievanceId: g.grievanceId,
        title: g.title,
        status: g.status,
        priority: g.priority,
        student: g.submittedBy?.name,
        studentEmail: g.submittedBy?.email,
        department: g.department?.name,
        category: g.category?.name,
        assignedAdmin: g.assignedTo?.name,
        slaDeadline: g.slaDeadline,
        resolvedAt: g.resolvedAt,
        feedbackRating: g.feedbackRating,
        createdAt: g.createdAt,
    }));
    const csv = new Parser().parse(rows);
    res.header("Content-Type", "text/csv");
    res.attachment("grievances.csv");
    res.send(csv);
});

export default router;
