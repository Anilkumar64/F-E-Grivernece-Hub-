import express from "express";
import User from "../models/User.js";
import { authenticate, authorize } from "../middleware/authMiddleware.js";
import { writeAuditLog } from "../utils/audit.js";
import { forgotPassword, resetPassword, verifyResetOTP } from "../controllers/userController.js";

const router = express.Router();

router.post("/register", async (req, res) => {
    const { name, email, password, studentId, department, phone, address, yearOfStudy } = req.body;
    if (!name || !email || !password || !studentId) {
        return res.status(400).json({ message: "Name, email, password, and student ID are required" });
    }

    const user = await User.create({
        name,
        email,
        password,
        studentId,
        department: department || null,
        phone,
        address,
        yearOfStudy,
        role: "student",
    });

    await writeAuditLog(req, "STUDENT_REGISTERED", "User", user._id);
    res.status(201).json({ message: "Student registered successfully", userId: user._id });
});

router.post("/forgot-password", forgotPassword);
router.post("/verify-reset-otp", verifyResetOTP);
router.post("/reset-password", resetPassword);

router.get("/me", authenticate, authorize("student"), (req, res) => {
    res.json({ user: req.user });
});

export default router;
