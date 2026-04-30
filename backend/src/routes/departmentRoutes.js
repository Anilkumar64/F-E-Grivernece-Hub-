import express from "express";
import Department from "../models/Department.js";
import Admin from "../models/Admin.js";
import ComplaintType from "../models/ComplaintType.js";
import Grievance from "../models/Grievance.js";
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
        const { name, code, description, email, phone } = req.body;

        if (!name || !email) {
            return res.status(400).json({ message: "Department name and email required" });
        }

        const exists = await Department.findOne({ name });
        if (exists) {
            return res.status(400).json({ message: "Department already exists" });
        }

        const dept = await Department.create({ name, code, description, email, phone });

        res.status(201).json({ message: "Department created", department: dept });
    } catch (error) {
        console.error("Create department error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

// DELETE DEPARTMENT
router.delete("/:id", verifySuperAdmin, async (req, res) => {
    try {
        const [admin, type, grievance] = await Promise.all([
            Admin.exists({ department: req.params.id }),
            ComplaintType.exists({ department: req.params.id }),
            Grievance.exists({ department: req.params.id }),
        ]);

        if (admin || type || grievance) {
            return res.status(409).json({
                message: "Department is in use and cannot be deleted",
            });
        }

        await Department.findByIdAndDelete(req.params.id);
        res.json({ message: "Department deleted" });
    } catch (error) {
        console.error("Delete department error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

export default router;
