import express from "express";
import Department from "../models/Department.js";
import { verifySuperAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

// GET ALL DEPARTMENTS (PUBLIC)
router.get("/", async (req, res) => {
    try {
        const departments = await Department.find().sort({ name: 1 });
        res.json({ departments });   // ✅ FIXED SHAPE
    } catch (error) {
        console.error("Get departments error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

// CREATE NEW DEPARTMENT (SUPERADMIN)
router.post("/", verifySuperAdmin, async (req, res) => {
    try {
        const { name, code, description } = req.body;

        if (!name) {
            return res.status(400).json({ message: "Department name required" });
        }

        const exists = await Department.findOne({ name });
        if (exists) {
            return res.status(400).json({ message: "Department already exists" });
        }

        const dept = await Department.create({ name, code, description });

        res.status(201).json({ message: "Department created", department: dept });
    } catch (error) {
        console.error("Create department error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

// DELETE DEPARTMENT
router.delete("/:id", verifySuperAdmin, async (req, res) => {
    try {
        await Department.findByIdAndDelete(req.params.id);
        res.json({ message: "Department deleted" });
    } catch (error) {
        console.error("Delete department error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

export default router;
