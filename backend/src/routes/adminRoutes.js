import express from "express";
import crypto from "crypto";
import User from "../models/User.js";
import Department from "../models/Department.js";
import ApprovalRequest from "../models/ApprovalRequest.js";
import { guardSuperAdmin } from "../middleware/guards.js";
import { authorizePermission } from "../middleware/rbac.js";
import { requireStepUp } from "../middleware/stepUp.js";
import { writeAuditLog } from "../utils/audit.js";
import sendEmail from "../utils/sendEmail.js";

const router = express.Router();

// All routes require SuperAdmin
router.use(...guardSuperAdmin);

const adminProjection = "-password -refreshTokenHash -resetToken -resetTokenExpire";
const ensureApproval = async ({ approvalId, actorId, actionType }) => {
    if (!approvalId) return { ok: false, message: "approvalId is required for this action (4-eyes control)." };
    const request = await ApprovalRequest.findById(approvalId);
    if (!request) return { ok: false, message: "Approval request not found" };
    if (request.status !== "approved") return { ok: false, message: "Approval request is not approved" };
    if (request.requestedBy?.toString() === actorId) return { ok: false, message: "Requester cannot execute approved action" };
    if (request.actionType !== actionType) return { ok: false, message: "Approval action type mismatch" };
    if (request.expiresAt && request.expiresAt < new Date()) return { ok: false, message: "Approval request expired" };
    return { ok: true };
};

/* ── Create admin (superadmin-initiated, immediately active) ── */
router.post("/create", authorizePermission("admin.create"), requireStepUp(), async (req, res, next) => {
    try {
        const { name, email, staffId, department, isActive = true } = req.body;
        const password = req.body.autoGeneratePassword
            ? crypto.randomBytes(9).toString("base64url")
            : req.body.password;

        if (!name || !email || !staffId || !department || !password)
            return res.status(400).json({ message: "Name, email, staff ID, department, and password are required" });

        const dept = await Department.findById(department);
        if (!dept) return res.status(400).json({ message: "Department not found" });

        const admin = await User.create({
            name, email, password, staffId, department,
            role: "admin",
            isActive,
            isVerified: true,
        });

        await writeAuditLog(req, "ADMIN_CREATED", "User", admin._id, { department });

        return res.status(201).json({
            message: "Admin created",
            temporaryPassword: req.body.autoGeneratePassword ? password : undefined,
            admin: await User.findById(admin._id).select(adminProjection).populate("department", "name code"),
        });
    } catch (err) { next(err); }
});

/* ── List all admins ── */
router.get("/all", async (req, res, next) => {
    try {
        const admins = await User.find({ role: { $in: ["admin", "superadmin"] } })
            .select(adminProjection)
            .populate("department", "name code")
            .sort({ createdAt: -1 });
        res.json({ admins });
    } catch (err) { next(err); }
});

/* ── Pending admins (self-registered, awaiting approval) ── */
router.get("/pending", async (req, res, next) => {
    try {
        const pending = await User.find({ role: "admin", isVerified: false })
            .select("name email staffId department idCardFile createdAt")
            .populate("department", "name code");
        res.json({ pending });
    } catch (err) { next(err); }
});

/* ── Approve a self-registered admin ── */
router.patch("/:id/approve", authorizePermission("admin.approve"), async (req, res, next) => {
    try {
        const admin = await User.findOneAndUpdate(
            { _id: req.params.id, role: "admin" },
            { isVerified: true, isActive: true },
            { new: true }
        ).select(adminProjection).populate("department", "name code");

        if (!admin) return res.status(404).json({ message: "Admin not found" });

        await writeAuditLog(req, "ADMIN_APPROVED", "User", admin._id);

        sendEmail(
            admin.email,
            "Admin Account Approved – E-Grievance",
            `Hello ${admin.name},\n\nYour admin account has been approved. You can now log in.\n\nRegards,\nE-Grievance Team`
        ).catch((err) => console.warn("Approval email failed:", err.message));

        return res.json({ message: "Admin approved", admin });
    } catch (err) { next(err); }
});

/* ── Reject (delete) a self-registered admin ── */
router.delete("/:id/reject", authorizePermission("admin.reject"), async (req, res, next) => {
    try {
        const admin = await User.findOneAndDelete({ _id: req.params.id, role: "admin", isVerified: false });
        if (!admin) return res.status(404).json({ message: "Pending admin not found" });

        await writeAuditLog(req, "ADMIN_REJECTED", "User", admin._id);

        sendEmail(
            admin.email,
            "Admin Application Rejected – E-Grievance",
            `Hello ${admin.name},\n\nUnfortunately your admin application was not approved.\n\nRegards,\nE-Grievance Team`
        ).catch(() => { });

        return res.json({ message: "Admin rejected and removed" });
    } catch (err) { next(err); }
});

/* ── Update admin ── */
router.patch("/:id", authorizePermission("admin.update"), async (req, res, next) => {
    try {
        const allowed = ["name", "email", "staffId", "department", "isActive", "permissions"];
        const update = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));
        const admin = await User.findOneAndUpdate(
            { _id: req.params.id, role: "admin" },
            update,
            { new: true, runValidators: true }
        ).select(adminProjection).populate("department", "name code");

        if (!admin) return res.status(404).json({ message: "Admin not found" });

        await writeAuditLog(req, "ADMIN_UPDATED", "User", admin._id, update);
        return res.json({ message: "Admin updated", admin });
    } catch (err) { next(err); }
});

/* ── Reset admin password ── */
router.patch("/:id/reset-password", authorizePermission("admin.resetPassword"), requireStepUp(), async (req, res, next) => {
    try {
        const approval = await ensureApproval({
            approvalId: req.body?.approvalId,
            actorId: req.userId,
            actionType: "admin.reset-password",
        });
        if (!approval.ok) return res.status(400).json({ message: approval.message });
        const temporaryPassword = req.body.password || crypto.randomBytes(8).toString("base64url");
        const admin = await User.findOne({ _id: req.params.id, role: "admin" }).select("+password");
        if (!admin) return res.status(404).json({ message: "Admin not found" });

        admin.password = temporaryPassword;
        await admin.save();

        await writeAuditLog(req, "ADMIN_PASSWORD_RESET", "User", admin._id);
        return res.json({ message: "Password reset", temporaryPassword });
    } catch (err) { next(err); }
});

/* ── Deactivate admin ── */
router.delete("/:id", authorizePermission("admin.deactivate"), requireStepUp(), async (req, res, next) => {
    try {
        const approval = await ensureApproval({
            approvalId: req.body?.approvalId,
            actorId: req.userId,
            actionType: "admin.deactivate",
        });
        if (!approval.ok) return res.status(400).json({ message: approval.message });
        const admin = await User.findOneAndUpdate(
            { _id: req.params.id, role: "admin" },
            { isActive: false },
            { new: true }
        ).select(adminProjection);
        if (!admin) return res.status(404).json({ message: "Admin not found" });

        await writeAuditLog(req, "ADMIN_DEACTIVATED", "User", admin._id);
        return res.json({ message: "Admin deactivated", admin });
    } catch (err) { next(err); }
});

export default router;