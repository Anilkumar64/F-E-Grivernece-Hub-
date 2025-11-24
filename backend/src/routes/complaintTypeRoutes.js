// backend/src/routes/complaintTypeRoutes.js

import express from "express";
import { verifySuperAdmin } from "../middleware/authMiddleware.js";

import { createType } from "../controllers/complaintType/createType.js";
import { getTypes } from "../controllers/complaintType/getTypes.js";
import { deleteType } from "../controllers/complaintType/deleteType.js";

const router = express.Router();

/**
 * @route   POST /api/complaint-types/
 * @desc    Create new complaint type (superadmin only)
 */
router.post("/", verifySuperAdmin, createType);

/**
 * @route   GET /api/complaint-types/
 * @desc    Get all complaint types (public)
 */
router.get("/", getTypes);

/**
 * @route   DELETE /api/complaint-types/:id
 * @desc    Delete complaint type (superadmin only)
 */
router.delete("/:id", verifySuperAdmin, deleteType);

export default router;
