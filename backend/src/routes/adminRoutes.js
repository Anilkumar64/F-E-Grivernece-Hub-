import express from "express";
import crypto from "crypto";
import User from "../models/User.js";
import Department from "../models/Department.js";
import { authenticate, authorize } from "../middleware/authMiddleware.js";
import { writeAuditLog } from "../utils/audit.js";

const router = express.Router();

router.use(authenticate, authorize("superadmin"));

const adminProjection = "-password -refreshTokenHash -resetToken";

router.post("/create", async (req, res) => {
    const generatedPassword = crypto.randomBytes(9).toString("base64url");
    const { name, email, staffId, department, role = "admin", isActive = true } = req.body;
    const password = req.body.autoGeneratePassword ? generatedPassword : req.body.password;
    if (!name || !email || !staffId || !department || !password) {
        return res.status(400).json({ message: "Name, email, staff ID, department, and password are required" });
    }
    if (role !== "admin") return res.status(400).json({ message: "Only department admin accounts can be created here" });

    const dept = await Department.findById(department);
    if (!dept) return res.status(400).json({ message: "Department not found" });

    const admin = await User.create({ name, email, password, staffId, department, role: "admin", isActive });
    await writeAuditLog(req, "ADMIN_CREATED", "User", admin._id, { department });
    res.status(201).json({
        message: "Admin created",
        temporaryPassword: req.body.autoGeneratePassword ? password : undefined,
        admin: await User.findById(admin._id).select(adminProjection).populate("department", "name code"),
    });
});

router.get("/all", async (req, res) => {
    const admins = await User.find({ role: { $in: ["admin", "superadmin"] } })
        .select(adminProjection)
        .populate("department", "name code")
        .sort({ createdAt: -1 });
    res.json({ admins });
});

router.patch("/:id", async (req, res) => {
    const allowed = ["name", "email", "staffId", "department", "isActive"];
    const update = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
    const admin = await User.findOneAndUpdate({ _id: req.params.id, role: "admin" }, update, { new: true, runValidators: true })
        .select(adminProjection)
        .populate("department", "name code");
    if (!admin) return res.status(404).json({ message: "Admin not found" });
    await writeAuditLog(req, "ADMIN_UPDATED", "User", admin._id, update);
    res.json({ message: "Admin updated", admin });
});

router.patch("/:id/reset-password", async (req, res) => {
    const temporaryPassword = req.body.password || crypto.randomBytes(8).toString("base64url");
    const admin = await User.findOne({ _id: req.params.id, role: "admin" }).select("+password");
    if (!admin) return res.status(404).json({ message: "Admin not found" });
    admin.password = temporaryPassword;
    await admin.save();
    await writeAuditLog(req, "ADMIN_PASSWORD_RESET", "User", admin._id);
    res.json({ message: "Password reset", temporaryPassword });
});

router.delete("/:id", async (req, res) => {
    const admin = await User.findOneAndUpdate({ _id: req.params.id, role: "admin" }, { isActive: false }, { new: true }).select(adminProjection);
    if (!admin) return res.status(404).json({ message: "Admin not found" });
    await writeAuditLog(req, "ADMIN_DEACTIVATED", "User", admin._id);
    res.json({ message: "Admin deactivated", admin });
});

export default router;
