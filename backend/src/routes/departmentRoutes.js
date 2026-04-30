import express from "express";
import Department from "../models/Department.js";
import Grievance from "../models/Grievance.js";
import GrievanceCategory from "../models/GrievanceCategory.js";
import User from "../models/User.js";
import { authenticate, authorize } from "../middleware/authMiddleware.js";
import { writeAuditLog } from "../utils/audit.js";
import { delCache, getCache, setCache } from "../utils/cache.js";

const router = express.Router();

router.get("/", async (_req, res) => {
    const cached = await getCache("departments:all");
    if (cached) return res.json({ departments: cached });
    const departments = await Department.find()
        .populate("headAdmin", "name email staffId")
        .populate("grievanceCount")
        .sort({ name: 1 });
    await setCache("departments:all", departments);
    res.json({ departments });
});

router.get("/:id", authenticate, authorize("superadmin"), async (req, res) => {
    const department = await Department.findById(req.params.id)
        .populate("headAdmin", "name email staffId")
        .populate("grievanceCount");
    if (!department) return res.status(404).json({ message: "Department not found" });
    res.json({ department });
});

router.post("/", authenticate, authorize("superadmin"), async (req, res) => {
    const department = await Department.create(req.body);
    await delCache("departments:*");
    await writeAuditLog(req, "DEPARTMENT_CREATED", "Department", department._id);
    res.status(201).json({ message: "Department created", department });
});

router.patch("/:id", authenticate, authorize("superadmin"), async (req, res) => {
    const department = await Department.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!department) return res.status(404).json({ message: "Department not found" });
    await delCache("departments:*");
    await writeAuditLog(req, "DEPARTMENT_UPDATED", "Department", department._id, req.body);
    res.json({ message: "Department updated", department });
});

router.delete("/:id", authenticate, authorize("superadmin"), async (req, res) => {
    const department = await Department.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!department) return res.status(404).json({ message: "Department not found" });
    await delCache("departments:*");
    await writeAuditLog(req, "DEPARTMENT_DEACTIVATED", "Department", department._id);
    res.json({ message: "Department deactivated", department });
});

export default router;
