import express from "express";
import Department from "../models/Department.js";
import Grievance from "../models/Grievance.js";
import GrievanceCategory from "../models/GrievanceCategory.js";
import User from "../models/User.js";
import { authenticate, authorize } from "../middleware/authMiddleware.js";
import { writeAuditLog } from "../utils/audit.js";

const router = express.Router();

router.get("/", async (_req, res) => {
    const departments = await Department.find().populate("headAdmin", "name email").sort({ name: 1 });
    res.json({ departments });
});

router.post("/", authenticate, authorize("superadmin"), async (req, res) => {
    const department = await Department.create(req.body);
    await writeAuditLog(req, "DEPARTMENT_CREATED", "Department", department._id);
    res.status(201).json({ message: "Department created", department });
});

router.patch("/:id", authenticate, authorize("superadmin"), async (req, res) => {
    const department = await Department.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!department) return res.status(404).json({ message: "Department not found" });
    await writeAuditLog(req, "DEPARTMENT_UPDATED", "Department", department._id, req.body);
    res.json({ message: "Department updated", department });
});

router.delete("/:id", authenticate, authorize("superadmin"), async (req, res) => {
    const usage = await Promise.all([
        User.exists({ department: req.params.id }),
        Grievance.exists({ department: req.params.id }),
        GrievanceCategory.exists({ department: req.params.id }),
    ]);
    const inUse = usage.some(Boolean);

    if (inUse) return res.status(409).json({ message: "Department is in use and cannot be deleted" });
    const department = await Department.findByIdAndDelete(req.params.id);
    if (!department) return res.status(404).json({ message: "Department not found" });
    await writeAuditLog(req, "DEPARTMENT_DELETED", "Department", department._id);
    res.json({ message: "Department deleted" });
});

export default router;
