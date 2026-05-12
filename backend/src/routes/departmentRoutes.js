import express from "express";
import Department from "../models/Department.js";
import Course from "../models/Course.js";
import Admin from "../models/Admin.js";
import { guardSuperAdmin } from "../middleware/guards.js";
import { writeAuditLog } from "../utils/audit.js";
import { delCache, getCache, setCache } from "../utils/cache.js";
import { defaultDepartmentCodes, ensureAcademicCatalog } from "../utils/academicCatalog.js";

const router = express.Router();

// Allowed fields for create and update — prevents mass-assignment (M-05 / MO-07)
const ALLOWED_CREATE_FIELDS = ["name", "code", "description", "headAdmin", "courseIds", "newCourses"];
const ALLOWED_UPDATE_FIELDS = ["name", "code", "description", "headAdmin", "isActive"];

const pick = (obj, keys) =>
    Object.fromEntries(Object.entries(obj).filter(([k]) => keys.includes(k)));

const normalizeHeadAdmin = (payload) => {
    const next = { ...payload };
    if (Object.prototype.hasOwnProperty.call(next, "headAdmin") && !next.headAdmin) {
        next.headAdmin = null;
    }
    return next;
};

const syncDepartmentCourses = async (departmentId, payload, replaceExisting = false) => {
    const courseIds = Array.isArray(payload.courseIds) ? payload.courseIds.filter(Boolean) : null;
    const newCourses = Array.isArray(payload.newCourses) ? payload.newCourses : [];

    if (replaceExisting && courseIds) {
        await Course.updateMany({ department: departmentId, _id: { $nin: courseIds } }, { $set: { department: null } });
    }
    if (courseIds?.length) {
        await Course.updateMany({ _id: { $in: courseIds } }, { $set: { department: departmentId, isActive: true } });
    }

    for (const raw of newCourses) {
        const name = String(raw?.name || "").trim();
        const code = String(raw?.code || "").trim().toUpperCase();
        if (!name || !code) continue;
        await Course.findOneAndUpdate(
            { code, department: departmentId },
            {
                $set: {
                    name,
                    durationYears: Number(raw.durationYears) || 4,
                    department: departmentId,
                    isActive: true,
                },
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
    }
};

/* ── Public: list all departments ── */
router.get("/", async (req, res, next) => {
    try {
        await ensureAcademicCatalog();
        const hasCourses = req.query.hasCourses === "true";
        const cacheKey = hasCourses ? "departments:v2:with-courses" : "departments:v2:all";
        const cached = await getCache(cacheKey);
        if (cached) return res.json(cached);
        let query = Department.find();
        if (hasCourses) {
            const deptIds = await Course.distinct("department", { department: { $ne: null }, isActive: true });
            query = deptIds.length ? Department.find({ _id: { $in: deptIds } }) : Department.find({ isActive: true });
        }
        const departments = await query
            .populate("headAdmin", "name email staffId")
            .populate("grievanceCount")
            .sort({ name: 1 });
        await setCache(cacheKey, departments);
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
        const payload = pick(req.body, ALLOWED_CREATE_FIELDS);
        const data = normalizeHeadAdmin(pick(payload, ["name", "code", "description", "headAdmin"]));
        if (!data.name || !data.code) {
            return res.status(400).json({ message: "Name and code are required" });
        }
        if (data.headAdmin) {
            const headAdmin = await Admin.findOne({ _id: data.headAdmin, isActive: true }).select("_id");
            if (!headAdmin) return res.status(400).json({ message: "Selected head admin is invalid or inactive" });
        }
        const department = await Department.create(data);
        if (data.headAdmin) {
            // Auto-assign selected head admin to this department.
            await Admin.findByIdAndUpdate(data.headAdmin, { department: department._id }, { runValidators: true });
        }
        await syncDepartmentCourses(department._id, payload, false);
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
        const payload = pick(req.body, [...ALLOWED_UPDATE_FIELDS, "courseIds", "newCourses"]);
        const update = normalizeHeadAdmin(pick(payload, ALLOWED_UPDATE_FIELDS));
        const existingDepartment = await Department.findById(req.params.id).select("code");
        if (!existingDepartment) return res.status(404).json({ message: "Department not found" });
        if (
            Object.prototype.hasOwnProperty.call(update, "isActive") &&
            update.isActive === false &&
            defaultDepartmentCodes.has(existingDepartment.code)
        ) {
            return res.status(400).json({ message: "Default departments cannot be deactivated" });
        }
        if (Object.prototype.hasOwnProperty.call(update, "headAdmin") && update.headAdmin) {
            const headAdmin = await Admin.findOne({ _id: update.headAdmin, isActive: true }).select("_id");
            if (!headAdmin) return res.status(400).json({ message: "Selected head admin is invalid or inactive" });
        }
        const department = await Department.findByIdAndUpdate(
            req.params.id,
            update,
            { new: true, runValidators: true }
        );
        if (!department) return res.status(404).json({ message: "Department not found" });
        if (Object.prototype.hasOwnProperty.call(update, "headAdmin") && update.headAdmin) {
            // Auto-assign selected head admin to this department.
            await Admin.findByIdAndUpdate(update.headAdmin, { department: department._id }, { runValidators: true });
        }
        if (Array.isArray(payload.courseIds) || Array.isArray(payload.newCourses)) {
            await syncDepartmentCourses(department._id, payload, true);
        }
        await delCache("departments:*");
        await writeAuditLog(req, "DEPARTMENT_UPDATED", "Department", department._id, update);
        res.json({ message: "Department updated", department });
    } catch (err) { next(err); }
});

/* ── Protected: deactivate department (superadmin only) ── */
router.delete("/:id", ...guardSuperAdmin, async (req, res, next) => {
    try {
        const existingDepartment = await Department.findById(req.params.id).select("code");
        if (!existingDepartment) return res.status(404).json({ message: "Department not found" });
        if (defaultDepartmentCodes.has(existingDepartment.code)) {
            return res.status(400).json({ message: "Default departments cannot be removed" });
        }
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
