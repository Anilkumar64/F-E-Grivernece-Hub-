import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
    {
        recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
        type: {
            type: String,
            enum: ["grievance_submitted", "status_changed", "comment_added", "grievance_escalated", "sla_breach", "feedback_requested", "info"],
            default: "info",
        },
        title: { type: String, trim: true, default: "Notification" },
        message: { type: String, required: true, trim: true },
        grievance: { type: mongoose.Schema.Types.ObjectId, ref: "Grievance", default: null },
        isRead: { type: Boolean, default: false, index: true },
    },
    { timestamps: true }
);

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

export default mongoose.model("Notification", notificationSchema);
