import express from "express";
import Notification from "../models/Notification.js";
import { guardAny } from "../middleware/guards.js";

const router = express.Router();

// All routes require any logged-in user
router.use(...guardAny);

// ✅ FIX M-04: all three handlers lacked try/catch — DB errors left responses
// hanging forever. Wrapped each handler in try/catch with next(err).

router.get("/mine", async (req, res, next) => {
    try {
        const filter = { recipient: req.userId };
        if (req.query.unread === "true") filter.isRead = false;
        const notifications = await Notification.find(filter)
            .populate("grievance", "grievanceId title status")
            .sort({ createdAt: -1 })
            .limit(50);
        const unreadCount = await Notification.countDocuments({
            recipient: req.userId,
            isRead: false,
        });
        res.json({ unreadCount, notifications });
    } catch (err) {
        next(err);
    }
});

router.patch("/read-all", async (req, res, next) => {
    try {
        await Notification.updateMany(
            { recipient: req.userId, isRead: false },
            { isRead: true }
        );
        res.json({ message: "All notifications marked as read" });
    } catch (err) {
        next(err);
    }
});

router.patch("/:id/read", async (req, res, next) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, recipient: req.userId },
            { isRead: true },
            { new: true }
        );
        if (!notification)
            return res.status(404).json({ message: "Notification not found" });
        res.json({ message: "Notification marked as read", notification });
    } catch (err) {
        next(err);
    }
});

export default router;