import express from "express";
import User from "../models/User.js";
import { authenticate, authorize } from "../middleware/authMiddleware.js";
import userUploads from "../middleware/userUploads.js";

const router = express.Router();

router.get("/profile", authenticate, authorize("student"), async (req, res) => {
    const user = await User.findById(req.userId)
        .select("-password -refreshTokenHash -resetToken")
        .populate("department", "name code")
        .populate("course", "name code durationYears");
    res.json({ user });
});

router.patch("/profile", authenticate, authorize("student"), userUploads.single("profilePhoto"), async (req, res) => {
    const allowed = ["contactNumber", "phone", "alternateEmail", "address", "class"];
    const update = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
    if (req.file) update.profilePhoto = `/uploads/user_idcards/${req.file.filename}`;
    const user = await User.findByIdAndUpdate(req.userId, update, { new: true, runValidators: true })
        .select("-password -refreshTokenHash -resetToken")
        .populate("department", "name code")
        .populate("course", "name code durationYears");
    res.json({ message: "Profile updated", user });
});

export default router;
