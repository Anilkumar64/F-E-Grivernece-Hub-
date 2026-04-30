import express from "express";
import {
    createGrievance,
    getMyGrievances,
    getGrievanceByTrackingId,
    updateGrievanceStatus,
    getAdminDashboardData,
    getAdminLatestGrievances,
    getAdminAllGrievances,
    getAdminPendingGrievances,
    escalateGrievance,
    assignGrievance,
    updateGrievancePriority,
    addAdminNote,
    addTimelineEvent
} from "../controllers/grievanceController.js";

import Grievance from "../models/Grievance.js";
import { verifyToken, verifyAdmin } from "../middleware/authMiddleware.js";
import upload from "../middleware/upload.js";

const router = express.Router();

/* USER ROUTES */
router.post("/", verifyToken, upload.array("attachments", 10), createGrievance);
router.get("/my", verifyToken, getMyGrievances);

/* ADMIN ROUTES */
// ✅ Added verifyAdmin middleware for proper role-based authorization
router.get("/admin/dashboard", verifyToken, verifyAdmin, getAdminDashboardData);
router.get("/admin/latest", verifyToken, verifyAdmin, getAdminLatestGrievances);
router.get("/admin/all", verifyToken, verifyAdmin, getAdminAllGrievances);
router.get("/admin/pending", verifyToken, verifyAdmin, getAdminPendingGrievances);

router.get("/admin/grievance/:id", verifyToken, verifyAdmin, async (req, res) => {
    try {
        const grievance = await Grievance.findById(req.params.id)
            .populate("department")
            .populate("complaintType")
            .populate("assignedTo");

        if (!grievance) {
            return res.status(404).json({ message: "Grievance not found" });
        }

        res.json({ grievance });
    } catch (err) {
        res.status(500).json({ message: "Internal server error" });
    }
});

/* FETCH BY MONGODB _id */
router.get("/id/:id", verifyToken, async (req, res) => {
    try {
        const grievance = await Grievance.findById(req.params.id)
            .populate("assignedTo")
            .populate("department")
            .populate("complaintType");

        if (!grievance) {
            return res.status(404).json({ message: "Grievance not found" });
        }

        const isOwner = grievance.user?.toString() === req.userId;
        const isAdmin = ["departmentadmin", "superadmin"].includes(req.role);
        if (!isOwner && !isAdmin) {
            return res.status(403).json({ message: "Access denied" });
        }

        res.json({ grievance });
    } catch (err) {
        console.error("ID fetch error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

/* TRACK BY TRACKING ID */
router.get("/track/:trackingId", verifyToken, async (req, res) => {
    try {
        const grievance = await Grievance.findOne({ trackingId: req.params.trackingId })
            .populate("assignedTo")
            .populate("department")
            .populate("complaintType");

        if (!grievance) {
            return res.status(404).json({ message: "Tracking ID not found" });
        }

        const isOwner = grievance.user?.toString() === req.userId;
        const isAdmin = ["departmentadmin", "superadmin"].includes(req.role);
        if (!isOwner && !isAdmin) {
            return res.status(403).json({ message: "Access denied" });
        }

        res.json({ grievance });
    } catch (err) {
        console.error("Tracking error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

/* ACTION ROUTES */
router.patch("/escalate/:id", verifyToken, verifyAdmin, escalateGrievance);
router.patch("/update-status/:id", verifyToken, verifyAdmin, updateGrievanceStatus);
router.patch("/assign/:id", verifyToken, verifyAdmin, assignGrievance);
router.patch("/update-priority/:id", verifyToken, verifyAdmin, updateGrievancePriority);
router.post("/admin-note/:id", verifyToken, verifyAdmin, addAdminNote);
router.post("/timeline/:id", verifyToken, verifyAdmin, addTimelineEvent);

export default router;
