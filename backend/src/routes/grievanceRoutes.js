import express from "express";
import mongoose from "mongoose";
import PDFDocument from "pdfkit";
import Grievance, { GRIEVANCE_PRIORITIES, GRIEVANCE_STATUSES, TERMINAL_STATUSES } from "../models/Grievance.js";
import GrievanceCategory from "../models/GrievanceCategory.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import Department from "../models/Department.js";
import { guardStudent, guardAdmin, guardAny } from "../middleware/guards.js";
import upload from "../middleware/upload.js";
import { uploadLimiter } from "../middleware/rateLimiters.js";
import { writeAuditLog } from "../utils/audit.js";
import { getCache, setCache, delCache } from "../utils/cache.js";
import sendEmail from "../utils/sendEmail.js";

const router = express.Router();

/* ── Helpers ── */
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

const canView = (req, grievance) => {
    if (req.role === "superadmin") return true;
    if (req.role === "student") {
        const sid = grievance.submittedBy?._id?.toString() ?? grievance.submittedBy?.toString();
        return sid === req.userId;
    }
    if (req.role === "admin") {
        const gdid = grievance.department?._id?.toString() ?? grievance.department?.toString();
        return gdid === req.user.department?.toString();
    }
    return false;
};

const buildFilter = async (req) => {
    const filter = {};
    if (req.role === "student") filter.submittedBy = req.userId;
    if (req.role === "admin") filter.department = req.user.department;

    if (req.query.status) filter.status = req.query.status;
    if (req.query.priority) filter.priority = req.query.priority;
    if (req.query.category) filter.category = req.query.category;
    if (req.query.department && req.role === "superadmin") filter.department = req.query.department;
    if (req.query.assignedTo) filter.assignedTo = req.query.assignedTo;
    if (req.query.isEscalated === "true") filter.isEscalated = true;
    if (req.query.isAcademicUrgent === "true") filter.isAcademicUrgent = true;

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
            { submittedBy: { $in: students.map((s) => s._id) } },
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

/* ── POST / — Submit a new grievance (student only) ── */
router.post(
    "/",
    ...guardStudent,
    uploadLimiter, upload.array("attachments", 3),
    async (req, res, next) => {
        try {
            const {
                title,
                description,
                category,
                priority = "Medium",
                isAcademicUrgent = "false",
                urgentReason = "",
            } = req.body;

            if (!title || !description || !category)
                return res.status(400).json({ message: "Title, description, and category are required" });

            if (!GRIEVANCE_PRIORITIES.includes(priority))
                return res.status(400).json({ message: `Invalid priority. Valid: ${GRIEVANCE_PRIORITIES.join(", ")}` });

            const categoryDoc = await GrievanceCategory.findById(category);
            if (!categoryDoc) return res.status(400).json({ message: "Category not found" });

            const urgent = String(isAcademicUrgent) === "true" || isAcademicUrgent === true;
            const effectiveSlaHours = urgent
                ? Math.min(Number(categoryDoc.slaHours || 72), 24)
                : Number(categoryDoc.slaHours || 72);
            const slaDeadline = new Date(Date.now() + effectiveSlaHours * 60 * 60 * 1000);
            const attachments = (req.files || []).map((file) => ({
                filename: file.originalname,
                url: `/uploads/grievance_attachments/${file.filename}`,
                mimetype: file.mimetype,
                size: file.size,
            }));

            const grievance = await Grievance.create({
                title, description, category, priority,
                isAcademicUrgent: urgent,
                urgentReason: urgent ? String(urgentReason || "").trim().slice(0, 300) : "",
                submittedBy: req.userId,
                department: categoryDoc.department,
                attachments, slaDeadline,
                timeline: [{
                    status: "Pending",
                    message: urgent ? "Urgent academic grievance submitted" : "Grievance submitted",
                    updatedBy: req.userId,
                }],
            });

            const deptAdmins = await User.find({
                role: "admin", department: categoryDoc.department, isActive: true,
            }).select("_id");

            await Notification.insertMany([
                {
                    recipient: req.userId,
                    type: "grievance_submitted", title: "Grievance submitted",
                    message: `Your grievance ${grievance.grievanceId} was submitted.`,
                    grievance: grievance._id,
                },
                ...deptAdmins.map((a) => ({
                    recipient: a._id,
                    type: "grievance_submitted", title: "New grievance assigned",
                    message: `${urgent ? "[URGENT] " : ""}Grievance ${grievance.grievanceId} needs attention in your department.`,
                    grievance: grievance._id,
                })),
            ]);

            sendEmail(
                req.user.email,
                "Grievance Submitted – E-Grievance",
                `Your grievance "${title}" (${grievance.grievanceId}) has been submitted successfully.`
            ).catch(() => { });

            await writeAuditLog(req, "GRIEVANCE_CREATED", "Grievance", grievance._id, { grievanceId: grievance.grievanceId });
            await delCache("analytics:*");

            return res.status(201).json({
                message: "Grievance submitted",
                grievance: await populateGrievance(Grievance.findById(grievance._id)),
            });
        } catch (err) { next(err); }
    }
);

/* ── GET /mine — Student's own grievances ── */
router.get("/mine", ...guardStudent, async (req, res, next) => {
    try {
        const { page, limit, skip } = paginate(req.query);
        const filter = await buildFilter(req);
        const [grievances, total] = await Promise.all([
            populateGrievance(Grievance.find(filter)).sort(sortOption(req.query.sort)).skip(skip).limit(limit),
            Grievance.countDocuments(filter),
        ]);
        res.json({ grievances, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
    } catch (err) { next(err); }
});

/* ── GET /analytics — Dashboard analytics (admin/superadmin) ── */
router.get("/analytics", ...guardAdmin, async (req, res, next) => {
    try {
        const match = req.role === "admin" ? { department: new mongoose.Types.ObjectId(req.user.department) } : {};
        const cacheKey = `analytics:${req.role}:${req.user.department || "all"}`;
        const cached = await getCache(cacheKey);
        if (cached) return res.json(cached);

        const [statusDist, byCategory, byDepartment, totals, recent, slaWarnings, feedback] = await Promise.all([
            Grievance.aggregate([{ $match: match }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
            Grievance.aggregate([{ $match: match }, { $group: { _id: "$category", count: { $sum: 1 } } }, { $limit: 10 }]),
            Grievance.aggregate([{ $match: match }, { $group: { _id: "$department", count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
            Grievance.aggregate([
                { $match: match },
                {
                    $group: {
                        _id: null,
                        total: { $sum: 1 },
                        resolved: { $sum: { $cond: [{ $eq: ["$status", "Resolved"] }, 1, 0] } },
                        escalated: { $sum: { $cond: ["$isEscalated", 1, 0] } },
                    },
                },
            ]),
            populateGrievance(Grievance.find(match)).sort({ updatedAt: -1 }).limit(5),
            populateGrievance(Grievance.find({
                ...match,
                status: { $nin: ["Resolved", "Closed"] },
                slaDeadline: { $lte: new Date(Date.now() + 12 * 60 * 60 * 1000) },
            })).sort({ slaDeadline: 1 }).limit(10),
            Grievance.aggregate([
                { $match: { ...match, feedbackRating: { $ne: null } } },
                { $group: { _id: "$department", averageRating: { $avg: "$feedbackRating" }, count: { $sum: 1 } } },
            ]),
        ]);

        const payload = {
            statusDistribution: statusDist,
            byCategory, byDepartment,
            totals: totals[0] || { total: 0, resolved: 0, escalated: 0 },
            recent, slaWarnings, feedback,
        };
        await setCache(cacheKey, payload, 300);
        return res.json(payload);
    } catch (err) { next(err); }
});

/* ── GET / — All grievances (admin/superadmin) ── */
router.get("/", ...guardAdmin, async (req, res, next) => {
    try {
        const { page, limit, skip } = paginate(req.query);
        const filter = await buildFilter(req);
        const [grievances, total] = await Promise.all([
            populateGrievance(Grievance.find(filter)).sort(sortOption(req.query.sort)).skip(skip).limit(limit),
            Grievance.countDocuments(filter),
        ]);
        res.json({ grievances, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
    } catch (err) { next(err); }
});

/* ── GET /track/:id — Track by ID or grievanceId ── */
router.get("/track/:id", ...guardAny, async (req, res, next) => {
    try {
        const query = mongoose.Types.ObjectId.isValid(req.params.id)
            ? { $or: [{ _id: req.params.id }, { grievanceId: req.params.id }] }
            : { grievanceId: req.params.id };
        const grievance = await populateGrievance(Grievance.findOne(query));
        if (!grievance) return res.status(404).json({ message: "Grievance not found" });
        if (!canView(req, grievance)) return res.status(403).json({ message: "Forbidden" });
        return res.json({ grievance });
    } catch (err) { next(err); }
});

/* ── GET /:id/pdf — Download PDF report ── */
router.get("/:id/pdf", ...guardAny, async (req, res, next) => {
    try {
        const query = mongoose.Types.ObjectId.isValid(req.params.id)
            ? { $or: [{ _id: req.params.id }, { grievanceId: req.params.id }] }
            : { grievanceId: req.params.id };
        const grievance = await populateGrievance(Grievance.findOne(query));
        if (!grievance) return res.status(404).json({ message: "Grievance not found" });
        if (!canView(req, grievance)) return res.status(403).json({ message: "Forbidden" });

        // ✅ FIX M-08: sanitize text fields before embedding in the PDF to prevent
        // malicious content (null bytes, escape sequences) from corrupting the output.
        const safe = (val) =>
            String(val ?? "–")
                .replace(/\0/g, "")           // strip null bytes
                .replace(/[\x01-\x08\x0b-\x0c\x0e-\x1f\x7f]/g, "") // strip non-printable ctrl chars
                .trim() || "–";

        const doc = new PDFDocument({ margin: 48 });
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="Grievance_${safe(grievance.grievanceId)}.pdf"`
        );
        doc.pipe(res);

        doc.fontSize(18).text("University E-Grievance", { align: "center" });
        doc.moveDown();
        doc.fontSize(14).text(`${safe(grievance.grievanceId)} – ${safe(grievance.title)}`);
        doc.moveDown(0.5);
        doc.fontSize(10)
            .text(`Submitted:  ${new Date(grievance.createdAt).toLocaleString()}`)
            .text(`Student:    ${safe(grievance.submittedBy?.name)}`)
            .text(`Department: ${safe(grievance.department?.name)}`)
            .text(`Category:   ${safe(grievance.category?.name)}`)
            .text(`Priority:   ${safe(grievance.priority)}`)
            .text(`Status:     ${safe(grievance.status)}`);
        doc.moveDown();
        doc.fontSize(12).text("Description", { underline: true });
        doc.fontSize(10).text(safe(grievance.description));
        doc.moveDown();
        doc.fontSize(12).text("Timeline", { underline: true });
        grievance.timeline.forEach((t) =>
            doc.fontSize(10).text(
                `${new Date(t.timestamp).toLocaleString()} – ${safe(t.status)}: ${safe(t.message)}`
            )
        );
        doc.moveDown();
        doc.fontSize(12).text("Comments", { underline: true });
        if (!grievance.comments.length) doc.fontSize(10).text("No comments yet.");
        grievance.comments.forEach((c) =>
            doc.fontSize(10).text(
                `${safe(c.postedBy?.name || c.role)} (${new Date(c.timestamp).toLocaleString()}): ${safe(c.text)}`
            )
        );
        doc.end();
    } catch (err) { next(err); }
});

/* ── GET /:id — Single grievance ── */
router.get("/:id", ...guardAny, async (req, res, next) => {
    try {
        const query = mongoose.Types.ObjectId.isValid(req.params.id)
            ? { $or: [{ _id: req.params.id }, { grievanceId: req.params.id }] }
            : { grievanceId: req.params.id };
        const grievance = await populateGrievance(Grievance.findOne(query));
        if (!grievance) return res.status(404).json({ message: "Grievance not found" });
        if (!canView(req, grievance)) return res.status(403).json({ message: "Forbidden" });
        return res.json({ grievance });
    } catch (err) { next(err); }
});

/* ── PATCH /:id/status — Update status (admin/superadmin) ── */
router.patch("/:id/status", ...guardAdmin, async (req, res, next) => {
    try {
        const { status, message = "" } = req.body;
        if (!GRIEVANCE_STATUSES.includes(status))
            return res.status(400).json({ message: `Invalid status. Valid: ${GRIEVANCE_STATUSES.join(", ")}` });

        const grievance = await Grievance.findById(req.params.id);
        if (!grievance) return res.status(404).json({ message: "Grievance not found" });
        if (!canView(req, grievance)) return res.status(403).json({ message: "Forbidden" });

        // ✅ FIX M-06: block status transitions out of terminal states (Resolved / Closed).
        // Previously any status could be set regardless of current state, allowing
        // a "Resolved" grievance to be re-opened by simply PATCHing a new status.
        if (TERMINAL_STATUSES.has(grievance.status)) {
            return res.status(400).json({
                message: `Cannot change status of a ${grievance.status} grievance. It is in a terminal state.`,
            });
        }

        const wasTerminal = TERMINAL_STATUSES.has(grievance.status);
        grievance.status = status;
        grievance.timeline.push({ status, message, updatedBy: req.userId });
        if (status === "Resolved" && !wasTerminal) grievance.resolvedAt = new Date();

        await grievance.save();
        await delCache("analytics:*");

        await Notification.create({
            recipient: grievance.submittedBy,
            type: status === "Resolved" ? "feedback_requested" : "status_changed",
            title: "Grievance status updated",
            message: `Grievance ${grievance.grievanceId} is now ${status}.`,
            grievance: grievance._id,
        });

        const student = await User.findById(grievance.submittedBy).select("email name");
        if (student?.email) {
            sendEmail(
                student.email,
                `Grievance ${grievance.grievanceId} – Status Updated`,
                `Hello ${student.name},\n\nYour grievance status is now: ${status}.\n${message ? `\nNote: ${message}` : ""}`
            ).catch(() => { });
        }

        await writeAuditLog(req, "GRIEVANCE_STATUS_CHANGED", "Grievance", grievance._id, { status });
        return res.json({
            message: "Status updated",
            grievance: await populateGrievance(Grievance.findById(grievance._id)),
        });
    } catch (err) { next(err); }
});

/* ── PATCH /:id/assign — Assign to admin ── */
router.patch("/:id/assign", ...guardAdmin, async (req, res, next) => {
    try {
        const { assignedTo } = req.body;
        if (!mongoose.Types.ObjectId.isValid(assignedTo))
            return res.status(400).json({ message: "Invalid admin ID" });

        const assignee = await User.findOne({ _id: assignedTo, role: { $in: ["admin", "superadmin"] }, isActive: true });
        if (!assignee) return res.status(400).json({ message: "Admin not found or inactive" });

        const grievance = await Grievance.findById(req.params.id);
        if (!grievance) return res.status(404).json({ message: "Grievance not found" });
        if (!canView(req, grievance)) return res.status(403).json({ message: "Forbidden" });

        if (req.role === "admin" && assignee.department?.toString() !== req.user.department?.toString()) {
            return res.status(403).json({ message: "Cannot assign outside your department" });
        }

        grievance.assignedTo = assignedTo;
        grievance.timeline.push({ status: grievance.status, message: `Assigned to ${assignee.name}`, updatedBy: req.userId });
        await grievance.save();

        await Notification.create({
            recipient: assignedTo,
            type: "info",
            title: "Grievance assigned to you",
            message: `Grievance ${grievance.grievanceId} has been assigned to you.`,
            grievance: grievance._id,
        });

        await writeAuditLog(req, "GRIEVANCE_ASSIGNED", "Grievance", grievance._id, { assignedTo });
        return res.json({ message: "Grievance assigned", grievance: await populateGrievance(Grievance.findById(grievance._id)) });
    } catch (err) { next(err); }
});

/* ── PATCH /:id/priority — Change priority ── */
router.patch("/:id/priority", ...guardAdmin, async (req, res, next) => {
    try {
        const { priority } = req.body;
        if (!GRIEVANCE_PRIORITIES.includes(priority))
            return res.status(400).json({ message: `Invalid priority. Valid: ${GRIEVANCE_PRIORITIES.join(", ")}` });

        const grievance = await Grievance.findById(req.params.id);
        if (!grievance) return res.status(404).json({ message: "Grievance not found" });
        if (!canView(req, grievance)) return res.status(403).json({ message: "Forbidden" });

        grievance.priority = priority;
        await grievance.save();

        await writeAuditLog(req, "GRIEVANCE_PRIORITY_CHANGED", "Grievance", grievance._id, { priority });
        return res.json({ message: "Priority updated", grievance });
    } catch (err) { next(err); }
});

/* ── POST /:id/comments — Add a comment ── */
router.post("/:id/comments", ...guardAny, async (req, res, next) => {
    try {
        const text = (req.body.text || req.body.comment || "").trim();
        if (!text) return res.status(400).json({ message: "Comment text is required" });

        const grievance = await Grievance.findById(req.params.id);
        if (!grievance) return res.status(404).json({ message: "Grievance not found" });
        if (!canView(req, grievance)) return res.status(403).json({ message: "Forbidden" });

        grievance.comments.push({ text, postedBy: req.userId, role: req.role });
        await grievance.save();

        let recipientId;
        if (req.role === "student") {
            const admin = await User.findOne({ role: "admin", department: grievance.department, isActive: true }).select("_id");
            recipientId = admin?._id;
        } else {
            recipientId = grievance.submittedBy;
        }
        if (recipientId) {
            await Notification.create({
                recipient: recipientId,
                type: "comment_added",
                title: "New comment on your grievance",
                message: `New comment on grievance ${grievance.grievanceId}.`,
                grievance: grievance._id,
            });
        }

        await writeAuditLog(req, "GRIEVANCE_COMMENT_ADDED", "Grievance", grievance._id);
        return res.status(201).json({ message: "Comment added", grievance: await populateGrievance(Grievance.findById(grievance._id)) });
    } catch (err) { next(err); }
});

/* ── PATCH /:id/request-close — Student requests closure ── */
router.patch("/:id/request-close", ...guardStudent, async (req, res, next) => {
    try {
        const grievance = await Grievance.findById(req.params.id);
        if (!grievance) return res.status(404).json({ message: "Grievance not found" });
        if (!canView(req, grievance)) return res.status(403).json({ message: "Forbidden" });
        if (TERMINAL_STATUSES.has(grievance.status))
            return res.status(400).json({ message: "Grievance is already closed" });

        grievance.closureRequested = true;
        grievance.timeline.push({ status: grievance.status, message: "Student requested closure", updatedBy: req.userId });
        await grievance.save();

        return res.json({ message: "Closure request submitted", grievance: await populateGrievance(Grievance.findById(grievance._id)) });
    } catch (err) { next(err); }
});

/* ── POST /:id/feedback — Student submits feedback ── */
router.post("/:id/feedback", ...guardStudent, async (req, res, next) => {
    try {
        const { rating, text = "" } = req.body;
        if (Number(rating) < 1 || Number(rating) > 5)
            return res.status(400).json({ message: "Rating must be between 1 and 5" });

        const grievance = await Grievance.findById(req.params.id);
        if (!grievance) return res.status(404).json({ message: "Grievance not found" });
        if (!canView(req, grievance)) return res.status(403).json({ message: "Forbidden" });
        if (grievance.status !== "Resolved")
            return res.status(400).json({ message: "Feedback is only available after resolution" });
        if (grievance.feedbackRating)
            return res.status(409).json({ message: "Feedback already submitted" });

        grievance.feedbackRating = Number(rating);
        grievance.feedbackText = text;
        await grievance.save();
        await delCache("analytics:*");

        await writeAuditLog(req, "GRIEVANCE_FEEDBACK_SUBMITTED", "Grievance", grievance._id, { rating });
        return res.json({ message: "Feedback submitted", grievance });
    } catch (err) { next(err); }
});

/* ── PATCH /:id/reopen-request — Student requests reopen after resolution ── */
router.patch("/:id/reopen-request", ...guardStudent, async (req, res, next) => {
    try {
        const reason = String(req.body?.reason || "").trim();
        if (!reason) return res.status(400).json({ message: "Reopen reason is required" });

        const grievance = await Grievance.findById(req.params.id);
        if (!grievance) return res.status(404).json({ message: "Grievance not found" });
        if (!canView(req, grievance)) return res.status(403).json({ message: "Forbidden" });
        if (grievance.status !== "Resolved") {
            return res.status(400).json({ message: "Reopen is only available for resolved grievances" });
        }
        if (grievance.reopenRequested) {
            return res.status(409).json({ message: "Reopen request already submitted" });
        }

        const resolvedAt = grievance.resolvedAt ? new Date(grievance.resolvedAt).getTime() : 0;
        const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
        if (!resolvedAt || Date.now() - resolvedAt > sevenDaysMs) {
            return res.status(400).json({ message: "Reopen window has expired (7 days)" });
        }

        grievance.reopenRequested = true;
        grievance.reopenReason = reason;
        grievance.reopenedAt = new Date();
        grievance.reopenDecision = "pending";
        grievance.reopenDecisionReason = "";
        grievance.reopenReviewedAt = null;
        grievance.reopenReviewedBy = null;
        grievance.status = "UnderReview";
        grievance.timeline.push({
            status: "UnderReview",
            message: `Student requested reopen: ${reason}`,
            updatedBy: req.userId,
        });
        await grievance.save();

        const deptAdmins = await User.find({
            role: "admin",
            department: grievance.department,
            isActive: true,
        }).select("_id");
        if (deptAdmins.length) {
            await Notification.insertMany(deptAdmins.map((a) => ({
                recipient: a._id,
                type: "info",
                title: "Reopen request submitted",
                message: `Student requested reopening for grievance ${grievance.grievanceId}.`,
                grievance: grievance._id,
            })));
        }

        await writeAuditLog(req, "GRIEVANCE_REOPEN_REQUESTED", "Grievance", grievance._id, { reason });
        return res.json({
            message: "Reopen request submitted",
            grievance: await populateGrievance(Grievance.findById(grievance._id)),
        });
    } catch (err) { next(err); }
});

/* ── PATCH /:id/reopen-decision — Admin approves/rejects reopen request ── */
router.patch("/:id/reopen-decision", ...guardAdmin, async (req, res, next) => {
    try {
        const decision = String(req.body?.decision || "").toLowerCase();
        const reason = String(req.body?.reason || "").trim();
        if (!["approved", "rejected"].includes(decision)) {
            return res.status(400).json({ message: "Decision must be approved or rejected" });
        }
        if (decision === "rejected" && !reason) {
            return res.status(400).json({ message: "Rejection reason is required" });
        }

        const grievance = await Grievance.findById(req.params.id);
        if (!grievance) return res.status(404).json({ message: "Grievance not found" });
        if (!canView(req, grievance)) return res.status(403).json({ message: "Forbidden" });
        if (!grievance.reopenRequested) {
            return res.status(400).json({ message: "No reopen request to review" });
        }

        grievance.reopenDecision = decision;
        grievance.reopenDecisionReason = reason;
        grievance.reopenReviewedAt = new Date();
        grievance.reopenReviewedBy = req.userId;
        grievance.reopenRequested = false;
        grievance.status = decision === "approved" ? "InProgress" : "Resolved";
        grievance.timeline.push({
            status: grievance.status,
            message: decision === "approved"
                ? "Admin approved reopen request"
                : `Admin rejected reopen request${reason ? `: ${reason}` : ""}`,
            updatedBy: req.userId,
        });
        await grievance.save();

        await Notification.create({
            recipient: grievance.submittedBy,
            type: "status_changed",
            title: "Reopen request reviewed",
            message: decision === "approved"
                ? `Your reopen request for ${grievance.grievanceId} was approved.`
                : `Your reopen request for ${grievance.grievanceId} was rejected.`,
            grievance: grievance._id,
        });

        await writeAuditLog(req, "GRIEVANCE_REOPEN_DECISION", "Grievance", grievance._id, { decision, reason });
        return res.json({
            message: "Reopen decision saved",
            grievance: await populateGrievance(Grievance.findById(grievance._id)),
        });
    } catch (err) { next(err); }
});

/* ── POST /:id/attachments — Student adds follow-up evidence ── */
router.post("/:id/attachments", ...guardStudent, uploadLimiter, upload.array("attachments", 3), async (req, res, next) => {
    try {
        const grievance = await Grievance.findById(req.params.id);
        if (!grievance) return res.status(404).json({ message: "Grievance not found" });
        if (!canView(req, grievance)) return res.status(403).json({ message: "Forbidden" });

        const attachments = (req.files || []).map((file) => ({
            filename: file.originalname,
            url: `/uploads/grievance_attachments/${file.filename}`,
            mimetype: file.mimetype,
            size: file.size,
        }));
        if (!attachments.length) return res.status(400).json({ message: "No files uploaded" });

        grievance.attachments.push(...attachments);
        grievance.timeline.push({
            status: grievance.status,
            message: `Student added ${attachments.length} follow-up evidence file(s)`,
            updatedBy: req.userId,
        });
        await grievance.save();

        await writeAuditLog(req, "GRIEVANCE_EVIDENCE_ADDED", "Grievance", grievance._id, { count: attachments.length });
        return res.json({
            message: "Evidence uploaded successfully",
            grievance: await populateGrievance(Grievance.findById(grievance._id)),
        });
    } catch (err) { next(err); }
});

/* ── PATCH /:id/escalate — Manual escalation ── */
router.patch("/:id/escalate", ...guardAdmin, async (req, res, next) => {
    try {
        const { reason = "Manually escalated by admin" } = req.body;
        const grievance = await Grievance.findById(req.params.id);
        if (!grievance) return res.status(404).json({ message: "Grievance not found" });
        if (!canView(req, grievance)) return res.status(403).json({ message: "Forbidden" });
        if (grievance.isEscalated) return res.status(409).json({ message: "Already escalated" });

        grievance.status = "Escalated";
        grievance.isEscalated = true;
        grievance.escalatedAt = new Date();
        grievance.escalationReason = reason;
        grievance.timeline.push({ status: "Escalated", message: reason, updatedBy: req.userId });
        await grievance.save();

        const superAdmins = await User.find({ role: "superadmin", isActive: true }).select("_id");
        await Notification.insertMany(superAdmins.map((a) => ({
            recipient: a._id,
            type: "grievance_escalated",
            title: "Grievance escalated",
            message: `Grievance ${grievance.grievanceId} was manually escalated. Reason: ${reason}`,
            grievance: grievance._id,
        })));

        await writeAuditLog(req, "GRIEVANCE_ESCALATED", "Grievance", grievance._id, { reason });
        return res.json({ message: "Grievance escalated", grievance: await populateGrievance(Grievance.findById(grievance._id)) });
    } catch (err) { next(err); }
});

export default router;