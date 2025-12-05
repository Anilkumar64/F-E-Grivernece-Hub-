// backend/src/routes/complaintTypeRoutes.js
import express from "express";
import {
    getTypes,
    createType,
    deleteType,
} from "../controllers/complaintTypeRoutes.js";

const router = express.Router();

/**
 * GET /api/complaint-types
 * GET /api/complaint-types/all
 * GET /api/complaints/type/all   (via server alias)
 */

// main – list all complaint types
router.get("/", getTypes);

// alias – for "/all"
router.get("/all", getTypes);

// create new type
router.post("/", createType);

// delete type
router.delete("/:id", deleteType);

export default router;
