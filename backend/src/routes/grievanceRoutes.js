import express from "express";
import {
    createGrievance,
    getMyGrievances,
    getGrievanceByTrackingId,
    updateGrievanceStatus,
} from "../controllers/grievanceController.js";

import { verifyToken, verifySuperAdmin } from "../middleware/authMiddleware.js";
import upload from "../middleware/upload.js";

const router = express.Router();
router.post(
    "/",
    verifyToken,
    upload.array("attachments", 10),
    createGrievance
);
router.post(
    "/create",
    verifyToken,
    upload.array("attachments", 10),
    createGrievance
);

router.get("/my", verifyToken, getMyGrievances);
router.get("/:trackingId", verifyToken, getGrievanceByTrackingId);
router.put("/:id/status", verifyToken, updateGrievanceStatus);

export default router;
