import mongoose from "mongoose";

export const GRIEVANCE_STATUSES = ["Pending", "InProgress", "UnderReview", "Resolved", "Closed", "Escalated"];
export const GRIEVANCE_PRIORITIES = ["Low", "Medium", "High", "Critical"];

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
        isEscalated: { type: Boolean, default: false, index: true },
        escalatedAt: { type: Date, default: null },
        escalationReason: { type: String, trim: true, default: "" },
    },
    { timestamps: true }
);

grievanceSchema.index({ status: 1 });
grievanceSchema.index({ department: 1 });
grievanceSchema.index({ submittedBy: 1 });
grievanceSchema.index({ assignedTo: 1 });
grievanceSchema.index({ createdAt: -1 });
grievanceSchema.index({ department: 1, status: 1 });
grievanceSchema.index({ grievanceId: "text", title: "text" });

grievanceSchema.pre("validate", async function (next) {
    if (this.grievanceId) return next();
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    const count = await mongoose.model("Grievance").countDocuments({
        createdAt: { $gte: start, $lt: end },
    });
    this.grievanceId = `GRV-${datePart}-${String(count + 1).padStart(4, "0")}`;
    next();
});

export default mongoose.model("Grievance", grievanceSchema);
