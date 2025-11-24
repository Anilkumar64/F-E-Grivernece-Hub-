import express from "express";
import { verifySuperAdmin } from "../middleware/authMiddleware.js";

import { createType } from "../controllers/complaintType/createType.js";
import { getTypes } from "../controllers/complaintType/getTypes.js";
import { deleteType } from "../controllers/complaintType/deleteType.js";

const router = express.Router();

router.post("/", verifySuperAdmin, createType);
router.get("/", getTypes);
router.delete("/:id", verifySuperAdmin, deleteType);

export default router;
