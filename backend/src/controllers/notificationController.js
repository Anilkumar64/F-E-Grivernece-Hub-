import Notification from "../models/Notification.js";

// ✅ FIX MO-06: original function returned "Admin" for departmentadmin/admin roles.
// In this codebase, authenticated admins are stored in the User model (after C-07 fix),
// so their recipientModel must be "User". Only use "Admin" for the legacy pending-request
// Admin documents — which are never notification recipients.
const getRecipientModel = (role) => {
    // All roles resolve to "User" because authentication (and therefore notification
    // targeting) is unified under the User model.
    return "User";
};

/* ------------------------------------------------------------------
 🟩 CREATE NOTIFICATION
------------------------------------------------------------------ */
export const createNotification = async (req, res) => {
    try {
        const { recipientId, recipientRole, title, message, link, type, grievance } = req.body;

        if (!recipientId || !recipientRole || !message) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        const isAdminSender = ["superadmin", "departmentadmin", "admin"].includes(req.role);
        if (!isAdminSender && recipientId !== req.userId) {
            return res.status(403).json({ message: "Access denied" });
        }

        const newNotification = await Notification.create({
            recipient: recipientId,
            recipientModel: getRecipientModel(recipientRole),
            title,
            message,
            link,
            type,
            grievance: grievance || null,
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
 🟦 FETCH NOTIFICATIONS
------------------------------------------------------------------ */
export const getNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find({
            recipient: req.userId,
            recipientModel: getRecipientModel(req.role),
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

        const updated = await Notification.findOneAndUpdate(
            {
                _id: id,
                recipient: req.userId,
                recipientModel: getRecipientModel(req.role),
            },
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

        const deleted = await Notification.findOneAndDelete({
            _id: id,
            recipient: req.userId,
            recipientModel: getRecipientModel(req.role),
        });

        if (!deleted) return res.status(404).json({ message: "Notification not found" });

        res.status(200).json({ message: "Notification deleted successfully" });
    } catch (error) {
        console.error("Delete Notification Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};