import express from "express";
import GrievanceCategory from "../models/GrievanceCategory.js";
import Grievance from "../models/Grievance.js";
import { guardSuperAdmin } from "../middleware/guards.js";
import { writeAuditLog } from "../utils/audit.js";
import { delCache, getCache, setCache } from "../utils/cache.js";

const router = express.Router();

// ✅ FIX MO-04: whitelist allowed fields so raw req.body cannot inject arbitrary model fields
const ALLOWED_CREATE_FIELDS = ["name", "description", "department", "slaHours", "isActive"];
const ALLOWED_UPDATE_FIELDS = ["name", "description", "slaHours", "isActive"];

const pick = (obj, keys) =>
    Object.fromEntries(Object.entries(obj).filter(([k]) => keys.includes(k)));

router.get("/", async (req, res, next) => {
    try {
        const filter = req.query.department ? { department: req.query.department } : {};
        const cacheKey = `categories:${req.query.department || "all"}`;
        const cached = await getCache(cacheKey);
        if (cached) return res.json({ categories: cached });
        const categories = await GrievanceCategory.find(filter)
            .populate("department", "name code")
            .sort({ name: 1 });
        await setCache(cacheKey, categories);
        res.json({ categories });
    } catch (err) { next(err); }
});

router.post("/", ...guardSuperAdmin, async (req, res, next) => {
    try {
        // ✅ FIX MO-04: was `GrievanceCategory.create(req.body)` — now whitelisted
        const data = pick(req.body, ALLOWED_CREATE_FIELDS);
        if (!data.name || !data.department) {
            return res.status(400).json({ message: "Name and department are required" });
        }
        const category = await GrievanceCategory.create(data);
        await delCache("categories:*");
        await writeAuditLog(req, "CATEGORY_CREATED", "GrievanceCategory", category._id);
        res.status(201).json({ message: "Category created", category });
    } catch (err) { next(err); }
});

/* ── Protected: update category (superadmin only) ── */
router.patch("/:id", ...guardSuperAdmin, async (req, res, next) => {
    try {
        const update = pick(req.body, ALLOWED_UPDATE_FIELDS);
        const category = await GrievanceCategory.findByIdAndUpdate(
            req.params.id,
            update,
            { new: true, runValidators: true }
        );
        if (!category) return res.status(404).json({ message: "Category not found" });
        await delCache("categories:*");
        await writeAuditLog(req, "CATEGORY_UPDATED", "GrievanceCategory", category._id, update);
        res.json({ message: "Category updated", category });
    } catch (err) { next(err); }
});

/* ── Protected: delete category (superadmin only) ── */
router.delete("/:id", ...guardSuperAdmin, async (req, res, next) => {
    try {
        if (await Grievance.exists({ category: req.params.id })) {
            return res.status(409).json({ message: "Category is in use and cannot be deleted" });
        }
        const category = await GrievanceCategory.findByIdAndDelete(req.params.id);
        if (!category) return res.status(404).json({ message: "Category not found" });
        await delCache("categories:*");
        await writeAuditLog(req, "CATEGORY_DELETED", "GrievanceCategory", category._id);
        res.json({ message: "Category deleted" });
    } catch (err) { next(err); }
});

export default router;