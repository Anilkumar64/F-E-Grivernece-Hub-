import mongoose from "mongoose";
import { nextGrievanceId } from "../utils/grievanceIdCounter.js";

export const GRIEVANCE_STATUSES = ["Pending", "InProgress", "UnderReview", "Resolved", "Closed", "Escalated"];
export const GRIEVANCE_PRIORITIES = ["Low", "Medium", "High", "Critical"];
export const TERMINAL_STATUSES = new Set(["Resolved", "Closed"]);

const attachmentSchema = new mongoose.Schema(
    {
        filename: { type: String, required: true },
        url: { type: String, required: true },
        mimetype: { type: String, default: "" },
        size: { type: Number, default: 0 },
        uploadedAt: { type: Date, default: Date.now },
    },
    { _id: false }
);

const timelineSchema = new mongoose.Schema(
    {
        status: { type: String, enum: GRIEVANCE_STATUSES, required: true },
        message: { type: String, trim: true, default: "" },
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
        timestamp: { type: Date, default: Date.now },
    },
    { _id: true }
);

const commentSchema = new mongoose.Schema(
    {
        text: { type: String, required: true, trim: true, maxlength: 2000 },
        postedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        role: { type: String, enum: ["student", "admin", "superadmin"], required: true },
        timestamp: { type: Date, default: Date.now },
    },
    { _id: true }
);

const grievanceSchema = new mongoose.Schema(
    {
        grievanceId: { type: String, unique: true, index: true },
        title: { type: String, required: true, trim: true, maxlength: 160 },
        description: { type: String, required: true, trim: true, maxlength: 5000 },
        category: { type: mongoose.Schema.Types.ObjectId, ref: "GrievanceCategory", required: true, index: true },
        priority: { type: String, enum: GRIEVANCE_PRIORITIES, default: "Medium", index: true },
        isAcademicUrgent: { type: Boolean, default: false, index: true },
        urgentReason: { type: String, trim: true, default: "", maxlength: 300 },
        status: { type: String, enum: GRIEVANCE_STATUSES, default: "Pending", index: true },
        submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
        assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
        department: { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true, index: true },
        attachments: [attachmentSchema],
        timeline: [timelineSchema],
        comments: [commentSchema],
        slaDeadline: { type: Date, required: true, index: true },
        resolvedAt: { type: Date, default: null },
        feedbackRating: { type: Number, min: 1, max: 5, default: null },
        feedbackText: { type: String, trim: true, default: "", maxlength: 1000 },
        reopenRequested: { type: Boolean, default: false, index: true },
        reopenReason: { type: String, trim: true, default: "", maxlength: 1000 },
        reopenedAt: { type: Date, default: null },
        reopenDecision: { type: String, enum: ["pending", "approved", "rejected"], default: "pending", index: true },
        reopenDecisionReason: { type: String, trim: true, default: "", maxlength: 1000 },
        reopenReviewedAt: { type: Date, default: null },
        reopenReviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
        closureRequested: { type: Boolean, default: false },
        isEscalated: { type: Boolean, default: false, index: true },
        escalatedAt: { type: Date, default: null },
        escalationReason: { type: String, trim: true, default: "" },
    },
    { timestamps: true }
);

grievanceSchema.index({ createdAt: -1 });
grievanceSchema.index({ department: 1, status: 1 });
grievanceSchema.index({ grievanceId: "text", title: "text" });

/* ── Atomic grievance ID generation (race-condition safe) ── */
grievanceSchema.pre("validate", async function (next) {
    if (this.grievanceId) return next();
    try {
        this.grievanceId = await nextGrievanceId();
    } catch (err) {
        return next(err);
    }
    next();
});

export default mongoose.model("Grievance", grievanceSchema);