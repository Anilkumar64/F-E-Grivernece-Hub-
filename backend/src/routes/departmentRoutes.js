import express from "express";
import Department from "../models/Department.js";
import { guardSuperAdmin } from "../middleware/guards.js";
import { writeAuditLog } from "../utils/audit.js";
import { delCache, getCache, setCache } from "../utils/cache.js";

const router = express.Router();

// Allowed fields for create and update — prevents mass-assignment (M-05 / MO-07)
const ALLOWED_CREATE_FIELDS = ["name", "code", "description", "headAdmin"];
const ALLOWED_UPDATE_FIELDS = ["name", "code", "description", "headAdmin", "isActive"];

const pick = (obj, keys) =>
    Object.fromEntries(Object.entries(obj).filter(([k]) => keys.includes(k)));

/* ── Public: list all departments ── */
router.get("/", async (_req, res, next) => {
    try {
        const cached = await getCache("departments:all");
        if (cached) return res.json(cached);
        const departments = await Department.find()
            .populate("headAdmin", "name email staffId")
            .sort({ name: 1 });
        await setCache("departments:all", departments);
        res.json(departments);
    } catch (err) { next(err); }
});

/* ── Protected: get single department (superadmin only) ── */
router.get("/:id", ...guardSuperAdmin, async (req, res, next) => {
    try {
        const department = await Department.findById(req.params.id)
            .populate("headAdmin", "name email staffId");
        if (!department) return res.status(404).json({ message: "Department not found" });
        res.json({ department });
    } catch (err) { next(err); }
});

/* ── Protected: create department (superadmin only) ── */
router.post("/", ...guardSuperAdmin, async (req, res, next) => {
    try {
        // ✅ FIX M-05: was `Department.create(req.body)` — whitelisting prevents
        // a client from injecting arbitrary fields (e.g. isActive, headAdmin, _id).
        const data = pick(req.body, ALLOWED_CREATE_FIELDS);
        if (!data.name || !data.code) {
            return res.status(400).json({ message: "Name and code are required" });
        }
        const department = await Department.create(data);
        await delCache("departments:*");
        await writeAuditLog(req, "DEPARTMENT_CREATED", "Department", department._id);
        res.status(201).json({ message: "Department created", department });
    } catch (err) { next(err); }
});

/* ── Protected: update department (superadmin only) ── */
router.patch("/:id", ...guardSuperAdmin, async (req, res, next) => {
    try {
        // ✅ FIX MO-07 (superAdminRoutes PATCH /departments/:id had no whitelist too —
        // same fix applied here for the departmentRoutes version)
        const update = pick(req.body, ALLOWED_UPDATE_FIELDS);
        const department = await Department.findByIdAndUpdate(
            req.params.id,
            update,
            { new: true, runValidators: true }
        );
        if (!department) return res.status(404).json({ message: "Department not found" });
        await delCache("departments:*");
        await writeAuditLog(req, "DEPARTMENT_UPDATED", "Department", department._id, update);
        res.json({ message: "Department updated", department });
    } catch (err) { next(err); }
});

/* ── Protected: deactivate department (superadmin only) ── */
router.delete("/:id", ...guardSuperAdmin, async (req, res, next) => {
    try {
        const department = await Department.findByIdAndUpdate(
            req.params.id,
            { isActive: false },
            { new: true }
        );
        if (!department) return res.status(404).json({ message: "Department not found" });
        await delCache("departments:*");
        await writeAuditLog(req, "DEPARTMENT_DEACTIVATED", "Department", department._id);
        res.json({ message: "Department deactivated", department });
    } catch (err) { next(err); }
});

export default router;