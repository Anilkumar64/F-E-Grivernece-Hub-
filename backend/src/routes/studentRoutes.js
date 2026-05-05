import express from "express";
import mongoose from "mongoose";
import User from "../models/User.js";
import "../models/Course.js";
import { authenticate, authorize } from "../middleware/authMiddleware.js";
import userUploads from "../middleware/userUploads.js";

const router = express.Router();

router.get("/profile", authenticate, authorize("student"), async (req, res) => {
    try {
        const user = await User.findById(req.userId)
            .select("-password -refreshTokenHash -resetToken")
            .populate("department", "name code")
            .populate("course", "name code durationYears");
        res.json({ user });
    } catch (err) {
        res.status(500).json({ message: "Unable to load profile" });
    }
});

router.patch("/profile", authenticate, authorize("student"), userUploads.single("profilePhoto"), async (req, res, next) => {
    try {
        const allowed = [
            "rollNumber",
            "studentId",
            "course",
            "yearOfStudy",
            "class",
            "department",
            "admissionYear",
            "contactNumber",
            "phone",
            "alternateEmail",
            "address",
        ];
        const update = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));

        // Treat empty optional inputs as "no change" so profile save works
        // even when the user leaves many fields blank.
        const optionalFields = new Set([
            "rollNumber",
            "course",
            "yearOfStudy",
            "class",
            "department",
            "admissionYear",
            "contactNumber",
            "phone",
            "alternateEmail",
            "address",
        ]);
        Object.keys(update).forEach((key) => {
            if (optionalFields.has(key) && update[key] === "") {
                delete update[key];
            }
        });

        // Optional ObjectId fields can arrive as "" from <select>; convert safely.
        if (Object.prototype.hasOwnProperty.call(update, "course")) {
            update.course = update.course ? update.course : null;
            if (update.course && !mongoose.Types.ObjectId.isValid(update.course)) {
                return res.status(400).json({ message: "Invalid course selected" });
            }
        }
        if (Object.prototype.hasOwnProperty.call(update, "department")) {
            update.department = update.department ? update.department : null;
            if (update.department && !mongoose.Types.ObjectId.isValid(update.department)) {
                return res.status(400).json({ message: "Invalid department selected" });
            }
        }

        // Optional numeric field can arrive as ""; normalize to null.
        if (Object.prototype.hasOwnProperty.call(update, "admissionYear")) {
            update.admissionYear = update.admissionYear === "" ? null : Number(update.admissionYear);
            if (update.admissionYear !== null && Number.isNaN(update.admissionYear)) {
                return res.status(400).json({ message: "Invalid admission year" });
            }
        }

        if (req.file) update.profilePhoto = `/uploads/user_idcards/${req.file.filename}`;

        const user = await User.findByIdAndUpdate(req.userId, update, { new: true, runValidators: true })
            .select("-password -refreshTokenHash -resetToken")
            .populate("department", "name code")
            .populate("course", "name code durationYears");
        res.json({ message: "Profile updated", user });
    } catch (err) {
        next(err);
    }
});

export default router;
