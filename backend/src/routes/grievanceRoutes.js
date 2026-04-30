import express from "express";
import mongoose from "mongoose";
import PDFDocument from "pdfkit";
import Grievance, { GRIEVANCE_PRIORITIES, GRIEVANCE_STATUSES } from "../models/Grievance.js";
import GrievanceCategory from "../models/GrievanceCategory.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import { authenticate, authorize } from "../middleware/authMiddleware.js";
import upload from "../middleware/upload.js";
import { uploadLimiter } from "../middleware/rateLimiters.js";
import { writeAuditLog } from "../utils/audit.js";
import { getCache, setCache } from "../utils/cache.js";

const router = express.Router();

const populateGrievance = (query) =>
    query
        .populate("submittedBy", "name email studentId")
        .populate("assignedTo", "name email staffId")
        .populate("department", "name code")
        .populate("category", "name slaHours")
        .populate("comments.postedBy", "name role");

const paginate = (query) => {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
    return { page, limit, skip: (page - 1) * limit };
};

const visibleToUser = (req, grievance) => {
    if (req.role === "superadmin") return true;
    if (req.role === "student") return grievance.submittedBy?._id?.toString?.() === req.userId || grievance.submittedBy?.toString() === req.userId;
    if (req.role === "admin") return grievance.department?._id?.toString?.() === req.user.department?.toString() || grievance.department?.toString() === req.user.department?.toString();
    return false;
};

const listFilter = async (req) => {
    const filter = {};
    if (req.role === "student") filter.submittedBy = req.userId;
    if (req.role === "admin") filter.department = req.user.department;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.priority) filter.priority = req.query.priority;
    if (req.query.category) filter.category = req.query.category;
    if (req.query.department && req.role === "superadmin") filter.department = req.query.department;
    if (req.query.from || req.query.to) {
        filter.createdAt = {};
        if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
        if (req.query.to) filter.createdAt.$lte = new Date(req.query.to);
    }
    if (req.query.search) {
        const q = req.query.search.trim();
        const students = await User.find({ name: new RegExp(q, "i"), role: "student" }).select("_id");
        filter.$or = [
            { grievanceId: new RegExp(q, "i") },
            { title: new RegExp(q, "i") },
            { submittedBy: { $in: students.map((student) => student._id) } },
        ];
    }
    return filter;
};

const sortOption = (sort) => {
    if (sort === "oldest") return { createdAt: 1 };
    if (sort === "priority") return { priority: -1, createdAt: -1 };
    if (sort === "slaDeadline") return { slaDeadline: 1 };
    return { createdAt: -1 };
};

router.post("/", authenticate, authorize("student"), uploadLimiter, upload.array("attachments", 3), async (req, res) => {
    const { title, description, category, priority = "Medium" } = req.body;
    if (!title || !description || !category) {
        return res.status(400).json({ message: "Title, description, and category are required" });
    }
    if (!GRIEVANCE_PRIORITIES.includes(priority)) return res.status(400).json({ message: "Invalid priority" });

    const categoryDoc = await GrievanceCategory.findById(category);
    if (!categoryDoc) return res.status(400).json({ message: "Category not found" });

    const slaDeadline = new Date(Date.now() + categoryDoc.slaHours * 60 * 60 * 1000);
    const attachments = (req.files || []).map((file) => ({
        filename: file.originalname,
        url: `/uploads/grievance_attachments/${file.filename}`,
        mimetype: file.mimetype,
        size: file.size,
    }));

    const grievance = await Grievance.create({
        title,
        description,
        category,
        priority,
        submittedBy: req.userId,
        department: categoryDoc.department,
        attachments,
        slaDeadline,
        timeline: [{ status: "Pending", message: "Grievance submitted", updatedBy: req.userId }],
    });

    const admins = await User.find({ role: "admin", department: categoryDoc.department, isActive: true }).select("_id");
    await Notification.insertMany([
        { recipient: req.userId, type: "grievance_submitted", title: "Grievance submitted", message: `Your grievance ${grievance.grievanceId} was submitted.`, grievance: grievance._id },
        ...admins.map((admin) => ({
            recipient: admin._id,
            type: "grievance_submitted",
            title: "New grievance assigned",
            message: `New grievance ${grievance.grievanceId} assigned to your department.`,
            grievance: grievance._id,
        })),
    ]);

    await writeAuditLog(req, "GRIEVANCE_CREATED", "Grievance", grievance._id, { grievanceId: grievance.grievanceId });
    res.status(201).json({ message: "Grievance submitted", grievance: await populateGrievance(Grievance.findById(grievance._id)) });
});

router.get("/mine", authenticate, authorize("student"), async (req, res) => {
    const { page, limit, skip } = paginate(req.query);
    const filter = await listFilter(req);
    const [grievances, total] = await Promise.all([
        populateGrievance(Grievance.find(filter)).sort(sortOption(req.query.sort)).skip(skip).limit(limit),
        Grievance.countDocuments(filter),
    ]);
    res.json({ grievances, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

router.get("/analytics", authenticate, authorize("admin", "superadmin"), async (req, res) => {
    const match = req.role === "admin" ? { department: new mongoose.Types.ObjectId(req.user.department) } : {};
    const cacheKey = `analytics:${req.role}:${req.user.department || "all"}`;
    const cached = await getCache(cacheKey);
    if (cached) return res.json(cached);
    const [statusDistribution, byCategory, byDepartment, totals, recent, slaWarnings, feedback] = await Promise.all([
        Grievance.aggregate([{ $match: match }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
        Grievance.aggregate([{ $match: match }, { $group: { _id: "$category", count: { $sum: 1 } } }, { $limit: 10 }]),
        Grievance.aggregate([{ $match: match }, { $group: { _id: "$department", count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
        Grievance.aggregate([{ $match: match }, { $group: { _id: null, total: { $sum: 1 }, resolved: { $sum: { $cond: [{ $eq: ["$status", "Resolved"] }, 1, 0] } }, escalated: { $sum: { $cond: ["$isEscalated", 1, 0] } } } }]),
        populateGrievance(Grievance.find(match)).sort({ updatedAt: -1 }).limit(5),
        populateGrievance(Grievance.find({ ...match, status: { $nin: ["Resolved", "Closed"] }, slaDeadline: { $lte: new Date(Date.now() + 12 * 60 * 60 * 1000) } })).sort({ slaDeadline: 1 }).limit(10),
        Grievance.aggregate([{ $match: { ...match, feedbackRating: { $ne: null } } }, { $group: { _id: "$department", averageRating: { $avg: "$feedbackRating" }, count: { $sum: 1 } } }]),
    ]);
    const payload = { statusDistribution, byCategory, byDepartment, totals: totals[0] || { total: 0, resolved: 0, escalated: 0 }, recent, slaWarnings, feedback };
    await setCache(cacheKey, payload);
    res.json(payload);
});

router.get("/", authenticate, authorize("admin", "superadmin"), async (req, res) => {
    const { page, limit, skip } = paginate(req.query);
    const filter = await listFilter(req);
    const [grievances, total] = await Promise.all([
        populateGrievance(Grievance.find(filter)).sort(sortOption(req.query.sort)).skip(skip).limit(limit),
        Grievance.countDocuments(filter),
    ]);
    res.json({ grievances, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

router.get("/track/:id", authenticate, async (req, res) => {
    req.params.id = req.params.id;
    const query = mongoose.Types.ObjectId.isValid(req.params.id)
        ? { $or: [{ _id: req.params.id }, { grievanceId: req.params.id }] }
        : { grievanceId: req.params.id };
    const grievance = await populateGrievance(Grievance.findOne(query));
    if (!grievance) return res.status(404).json({ message: "Grievance not found" });
    if (!visibleToUser(req, grievance)) return res.status(403).json({ message: "Forbidden: grievance not accessible" });
    res.json({ grievance });
});

router.get("/:id/pdf", authenticate, async (req, res) => {
    const query = mongoose.Types.ObjectId.isValid(req.params.id)
        ? { $or: [{ _id: req.params.id }, { grievanceId: req.params.id }] }
        : { grievanceId: req.params.id };
    const grievance = await populateGrievance(Grievance.findOne(query));
    if (!grievance) return res.status(404).json({ message: "Grievance not found" });
    if (!visibleToUser(req, grievance)) return res.status(403).json({ message: "Forbidden: grievance not accessible" });

    const doc = new PDFDocument({ margin: 48 });
    const filename = `Grievance_${grievance.grievanceId}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    doc.pipe(res);

    doc.fontSize(18).text("University E-Grievance", { align: "center" });
    doc.moveDown();
    doc.fontSize(14).text(`${grievance.grievanceId} - ${grievance.title}`);
    doc.moveDown(0.5);
    doc.fontSize(10)
        .text(`Submitted: ${new Date(grievance.createdAt).toLocaleString()}`)
        .text(`Student: ${grievance.submittedBy?.name || "-"}`)
        .text(`Department: ${grievance.department?.name || "-"}`)
        .text(`Category: ${grievance.category?.name || "-"}`)
        .text(`Priority: ${grievance.priority}`)
        .text(`Status: ${grievance.status}`);
    doc.moveDown();
    doc.fontSize(12).text("Description", { underline: true });
    doc.fontSize(10).text(grievance.description || "-", { align: "left" });
    doc.moveDown();
    doc.fontSize(12).text("Timeline", { underline: true });
    grievance.timeline.forEach((item) => {
        doc.fontSize(10).text(`${new Date(item.timestamp).toLocaleString()} - ${item.status}: ${item.message || ""}`);
    });
    doc.moveDown();
    doc.fontSize(12).text("Comments", { underline: true });
    if (!grievance.comments.length) doc.fontSize(10).text("No comments yet.");
    grievance.comments.forEach((item) => {
        doc.fontSize(10).text(`${item.postedBy?.name || item.role} (${new Date(item.timestamp).toLocaleString()}): ${item.text}`);
    });
    doc.end();
});

router.get("/:id", authenticate, async (req, res) => {
    const query = mongoose.Types.ObjectId.isValid(req.params.id)
        ? { $or: [{ _id: req.params.id }, { grievanceId: req.params.id }] }
        : { grievanceId: req.params.id };
    const grievance = await populateGrievance(Grievance.findOne(query));
    if (!grievance) return res.status(404).json({ message: "Grievance not found" });
    if (!visibleToUser(req, grievance)) return res.status(403).json({ message: "Forbidden: grievance not accessible" });
    res.json({ grievance });
});

router.patch("/:id/status", authenticate, authorize("admin", "superadmin"), async (req, res) => {
    const { status, message = "" } = req.body;
    if (!GRIEVANCE_STATUSES.includes(status)) return res.status(400).json({ message: "Invalid status" });
    const grievance = await Grievance.findById(req.params.id);
    if (!grievance) return res.status(404).json({ message: "Grievance not found" });
    if (!visibleToUser(req, grievance)) return res.status(403).json({ message: "Forbidden: grievance not accessible" });

    grievance.status = status;
    grievance.timeline.push({ status, message, updatedBy: req.userId });
    if (status === "Resolved") grievance.resolvedAt = new Date();
    await grievance.save();

    await Notification.create({
        recipient: grievance.submittedBy,
        type: status === "Resolved" ? "feedback_requested" : "status_changed",
        title: "Grievance status updated",
        message: `Grievance ${grievance.grievanceId} status changed to ${status}.`,
        grievance: grievance._id,
    });
    await writeAuditLog(req, "GRIEVANCE_STATUS_CHANGED", "Grievance", grievance._id, { status });
    res.json({ message: "Status updated", grievance: await populateGrievance(Grievance.findById(grievance._id)) });
});

router.post("/:id/comments", authenticate, async (req, res) => {
    const text = req.body.text?.trim() || req.body.comment?.trim();
    if (!text) return res.status(400).json({ message: "Comment is required" });
    const grievance = await Grievance.findById(req.params.id);
    if (!grievance) return res.status(404).json({ message: "Grievance not found" });
    if (!visibleToUser(req, grievance)) return res.status(403).json({ message: "Forbidden: grievance not accessible" });

    grievance.comments.push({ text, postedBy: req.userId, role: req.role });
    await grievance.save();

    const recipient = req.role === "student"
        ? await User.findOne({ role: "admin", department: grievance.department, isActive: true }).select("_id")
        : await User.findById(grievance.submittedBy).select("_id");
    if (recipient) {
        await Notification.create({ recipient: recipient._id, type: "comment_added", title: "New comment", message: `New comment on grievance ${grievance.grievanceId}.`, grievance: grievance._id });
    }
    await writeAuditLog(req, "GRIEVANCE_COMMENT_ADDED", "Grievance", grievance._id);
    res.status(201).json({ message: "Comment added", grievance: await populateGrievance(Grievance.findById(grievance._id)) });
});

router.post("/comment/:id", authenticate, async (req, res) => {
    req.url = `/${req.params.id}/comments`;
    res.status(410).json({ message: "Use POST /api/grievances/:id/comments" });
});

router.patch("/request-close/:id", authenticate, authorize("student"), async (req, res) => {
    const grievance = await Grievance.findById(req.params.id);
    if (!grievance) return res.status(404).json({ message: "Grievance not found" });
    if (!visibleToUser(req, grievance)) return res.status(403).json({ message: "Forbidden: grievance not accessible" });
    grievance.timeline.push({ status: grievance.status, message: "Student requested closure", updatedBy: req.userId });
    await grievance.save();
    res.json({ message: "Close request submitted", grievance: await populateGrievance(Grievance.findById(grievance._id)) });
});

router.post("/:id/feedback", authenticate, authorize("student"), async (req, res) => {
    const { rating, text = "" } = req.body;
    const grievance = await Grievance.findById(req.params.id);
    if (!grievance) return res.status(404).json({ message: "Grievance not found" });
    if (!visibleToUser(req, grievance)) return res.status(403).json({ message: "Forbidden: grievance not accessible" });
    if (grievance.status !== "Resolved") return res.status(400).json({ message: "Feedback is available after resolution" });
    if (Number(rating) < 1 || Number(rating) > 5) return res.status(400).json({ message: "Rating must be between 1 and 5" });

    grievance.feedbackRating = Number(rating);
    grievance.feedbackText = text;
    await grievance.save();
    await writeAuditLog(req, "GRIEVANCE_FEEDBACK_SUBMITTED", "Grievance", grievance._id, { rating });
    res.json({ message: "Feedback submitted", grievance });
});

export default router;
