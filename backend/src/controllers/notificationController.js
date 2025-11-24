import Notification from "../models/Notification.js";
import Admin from "../models/Admin.js";

/* ------------------------------------------------------------------
 🟩 CREATE NOTIFICATION
------------------------------------------------------------------ */
export const createNotification = async (req, res) => {
    try {
        const { recipientId, recipientRole, title, message, link, type } = req.body;

        if (!recipientId || !recipientRole || !title || !message) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        const newNotification = await Notification.create({
            recipientId,
            recipientRole,
            title,
            message,
            link,
            type,
        });

        res.status(201).json({
            message: "Notification created successfully",
            notification: newNotification,
        });
    } catch (error) {
        console.error("Create Notification Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

/* ------------------------------------------------------------------
 🟦 FETCH NOTIFICATIONS (For a specific user)
------------------------------------------------------------------ */
export const getNotifications = async (req, res) => {
    try {
        const { userId, role } = req.query;

        if (!userId || !role)
            return res.status(400).json({ message: "userId and role required" });

        const notifications = await Notification.find({
            recipientId: userId,
            recipientRole: role,
        })
            .sort({ createdAt: -1 })
            .limit(20);

        res.status(200).json({ count: notifications.length, notifications });
    } catch (error) {
        console.error("Fetch Notifications Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

/* ------------------------------------------------------------------
 🟨 MARK AS READ
------------------------------------------------------------------ */
export const markAsRead = async (req, res) => {
    try {
        const { id } = req.params;

        const updated = await Notification.findByIdAndUpdate(
            id,
            { isRead: true },
            { new: true }
        );

        if (!updated) return res.status(404).json({ message: "Notification not found" });

        res.status(200).json({ message: "Notification marked as read", updated });
    } catch (error) {
        console.error("Mark as Read Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

/* ------------------------------------------------------------------
 🟥 DELETE NOTIFICATION
------------------------------------------------------------------ */
export const deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;

        const deleted = await Notification.findByIdAndDelete(id);

        if (!deleted) return res.status(404).json({ message: "Notification not found" });

        res.status(200).json({ message: "Notification deleted successfully" });
    } catch (error) {
        console.error("Delete Notification Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};
