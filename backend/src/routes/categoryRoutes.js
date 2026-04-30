import express from "express";
import GrievanceCategory from "../models/GrievanceCategory.js";
import Grievance from "../models/Grievance.js";
import { authenticate, authorize } from "../middleware/authMiddleware.js";
import { writeAuditLog } from "../utils/audit.js";

const router = express.Router();

router.get("/", async (req, res) => {
    const filter = req.query.department ? { department: req.query.department } : {};
    const categories = await GrievanceCategory.find(filter).populate("department", "name code").sort({ name: 1 });
    res.json({ categories });
});

router.post("/", authenticate, authorize("superadmin"), async (req, res) => {
    const category = await GrievanceCategory.create(req.body);
    await writeAuditLog(req, "CATEGORY_CREATED", "GrievanceCategory", category._id);
    res.status(201).json({ message: "Category created", category });
});

router.patch("/:id", authenticate, authorize("superadmin"), async (req, res) => {
    const category = await GrievanceCategory.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!category) return res.status(404).json({ message: "Category not found" });
    await writeAuditLog(req, "CATEGORY_UPDATED", "GrievanceCategory", category._id, req.body);
    res.json({ message: "Category updated", category });
});

router.delete("/:id", authenticate, authorize("superadmin"), async (req, res) => {
    if (await Grievance.exists({ category: req.params.id })) {
        return res.status(409).json({ message: "Category is in use and cannot be deleted" });
    }
    const category = await GrievanceCategory.findByIdAndDelete(req.params.id);
    if (!category) return res.status(404).json({ message: "Category not found" });
    await writeAuditLog(req, "CATEGORY_DELETED", "GrievanceCategory", category._id);
    res.json({ message: "Category deleted" });
});

export default router;
