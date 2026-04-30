import express from "express";
import Notification from "../models/Notification.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authenticate);

router.get("/mine", async (req, res) => {
    const filter = { recipient: req.userId };
    if (req.query.unread === "true") filter.isRead = false;
    const notifications = await Notification.find(filter)
        .populate("grievance", "grievanceId title status")
        .sort({ createdAt: -1 })
        .limit(50);
    const unreadCount = await Notification.countDocuments({ recipient: req.userId, isRead: false });
    res.json({ unreadCount, notifications });
});

router.patch("/read-all", async (req, res) => {
    await Notification.updateMany({ recipient: req.userId, isRead: false }, { isRead: true });
    res.json({ message: "All notifications marked as read" });
});

router.patch("/:id/read", async (req, res) => {
    const notification = await Notification.findOneAndUpdate(
        { _id: req.params.id, recipient: req.userId },
        { isRead: true },
        { new: true }
    );
    if (!notification) return res.status(404).json({ message: "Notification not found" });
    res.json({ message: "Notification marked as read", notification });
});

export default router;
