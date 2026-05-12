import express from "express";
import Notification from "../models/Notification.js";
import PushSubscription from "../models/PushSubscription.js";
import { guardAny } from "../middleware/guards.js";
import notificationService from "../services/notificationService.js";

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

// Push notification subscription management
router.post("/subscribe", async (req, res, next) => {
    try {
        const { endpoint, keys } = req.body;

        if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
            return res.status(400).json({ message: "Invalid subscription data" });
        }

        // Remove existing subscription for this endpoint
        await PushSubscription.deleteOne({
            userId: req.userId,
            endpoint
        });

        // Create new subscription
        const subscription = await PushSubscription.create({
            userId: req.userId,
            endpoint,
            keys,
            userAgent: req.headers['user-agent'] || '',
        });

        res.json({
            message: "Subscribed successfully",
            subscriptionId: subscription._id
        });
    } catch (err) {
        next(err);
    }
});

router.delete("/unsubscribe", async (req, res, next) => {
    try {
        const { endpoint } = req.body;

        if (!endpoint) {
            return res.status(400).json({ message: "Endpoint is required" });
        }

        const result = await PushSubscription.deleteOne({
            userId: req.userId,
            endpoint
        });

        if (result.deletedCount === 0) {
            return res.status(404).json({ message: "Subscription not found" });
        }

        res.json({ message: "Unsubscribed successfully" });
    } catch (err) {
        next(err);
    }
});

// Get VAPID public key for push notifications
router.get("/vapid-public-key", async (req, res, next) => {
    try {
        const publicKey = process.env.VAPID_PUBLIC_KEY;
        if (!publicKey) {
            return res.status(503).json({
                message: "Push notifications not configured"
            });
        }
        res.json({ publicKey });
    } catch (err) {
        next(err);
    }
});

// Test notification endpoint
router.post("/test", async (req, res, next) => {
    try {
        const { channels = ['database'] } = req.body;

        const result = await notificationService.sendNotification({
            userId: req.userId,
            type: 'test',
            title: 'Test Notification',
            message: 'This is a test notification from the E-Grievance system.',
            channels,
            data: { timestamp: new Date().toISOString() },
        });

        res.json({
            message: "Test notification sent",
            results: result
        });
    } catch (err) {
        next(err);
    }
});

export default router;