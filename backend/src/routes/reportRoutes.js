import express from "express";
import { Parser } from "json2csv";
import Grievance from "../models/Grievance.js";
import { guardSuperAdmin } from "../middleware/guards.js";

const router = express.Router();

const CSV_FIELDS = [
    "grievanceId", "title", "status", "priority",
    "student", "studentEmail", "department", "category",
    "assignedAdmin", "slaDeadline", "resolvedAt", "feedbackRating", "createdAt",
];

router.get("/grievances.csv", ...guardSuperAdmin, async (req, res, next) => {
    try {
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
        // Always pass explicit fields so json2csv never throws on empty result sets
        const csv = new Parser({ fields: CSV_FIELDS }).parse(rows);
        res.header("Content-Type", "text/csv");
        res.attachment("grievances.csv");
        res.send(csv);
    } catch (err) { next(err); }
});

export default router;