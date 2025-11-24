// backend/src/models/Grievance.js
import mongoose from "mongoose";

const timelineSchema = new mongoose.Schema({
    status: { type: String, required: true },
    message: { type: String, default: "" },
    date: { type: Date, default: Date.now },
});

const feedbackSchema = new mongoose.Schema({
    rating: { type: Number, min: 1, max: 5 },
    comment: { type: String, default: "" },
});

const attachmentSchema = new mongoose.Schema({
    fileName: { type: String },
    fileUrl: { type: String },
    uploadedAt: { type: Date, default: Date.now },
});

const grievanceSchema = new mongoose.Schema(
    {
        // Student who created the grievance
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        // Denormalized user email for quick lookups / notifications
        userEmail: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
        },

        // Link to complaint type (Exam Issue, Hostel Issue, etc.)
        complaintType: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ComplaintType",
            required: false,
        },

        // Department (can be auto-filled from complaintType)
        department: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Department",
            required: true,
        },

        // Core details
        title: {
            type: String,
            required: [true, "Complaint title is required"],
            trim: true,
        },
        description: {
            type: String,
            required: [true, "Complaint description is required"],
        },

        // Attachments (store file metadata)
        attachments: [attachmentSchema],

        // Status (single source of truth)
        status: {
            type: String,
            enum: ["submitted", "in_progress", "resolved", "rejected"],
            default: "submitted",
        },

        // Optional priority (keep if needed)
        priority: {
            type: String,
            enum: ["low", "medium", "high", "critical"],
            default: "medium",
        },

        // Admin assigned to this grievance
        assignedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Admin",
            default: null,
        },

        // Admin internal remarks (optional, visible to admins only)
        adminRemarks: {
            type: String,
            default: "",
        },

        // Feedback from user after resolution
        userFeedback: feedbackSchema,

        // Optionally allow anonymous submissions
        isAnonymous: {
            type: Boolean,
            default: false,
        },

        // When the grievance was resolved (if resolved)
        resolutionDate: {
            type: Date,
            default: null,
        },

        // Unique public tracking id
        trackingId: {
            type: String,
            unique: true,
            required: true,
        },

        // Timeline of status changes
        timeline: [timelineSchema],
    },
    { timestamps: true }
);

// Indexes for common queries
grievanceSchema.index({ user: 1 });
grievanceSchema.index({ department: 1 });
grievanceSchema.index({ assignedTo: 1 });
grievanceSchema.index({ status: 1 });
grievanceSchema.index({ trackingId: 1 });

// Auto-generate trackingId if not present
grievanceSchema.pre("validate", function (next) {
    if (!this.trackingId) {
        // more compact unique id
        this.trackingId = `GRV-${Date.now().toString(36)}-${Math.floor(Math.random() * 9000 + 1000)}`;
    }
    next();
});

export default mongoose.model("Grievance", grievanceSchema);
