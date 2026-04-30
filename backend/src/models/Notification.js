import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
    {
        // 🔔 Notification message
        message: {
            type: String,
            required: [true, "Notification message is required"],
        },

        title: {
            type: String,
            default: "",
        },

        // 👤 Who should receive this notification
        recipient: {
            type: mongoose.Schema.Types.ObjectId,
            refPath: "recipientModel", // can point to User or Admin
            required: true,
        },

        // 🧩 Dynamic reference (User / Admin)
        recipientModel: {
            type: String,
            required: true,
            enum: ["User", "Admin"],
        },

        // 📦 Context (optional link to grievance)
        grievance: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Grievance",
            default: null,
        },

        link: {
            type: String,
            default: "",
        },

        // 🚦 Type of notification
        type: {
            type: String,
            enum: [
                "info",
                "warning",
                "update",
                "status_change",
                "new_grievance",
                "resolved",
            ],
            default: "info",
        },

        // ✅ Whether user/admin read it
        isRead: {
            type: Boolean,
            default: false,
        },

        // ⏰ Optional auto-expire logic (for later enhancement)
        expiresAt: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true }
);

// Optional: auto-delete expired notifications
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("Notification", notificationSchema);

