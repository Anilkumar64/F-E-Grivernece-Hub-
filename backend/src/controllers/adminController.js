// ✅ FIX C-07: This controller previously used the legacy Admin model for ALL operations,
// creating a parallel registration system that bypassed the canonical User model.
// Admin authentication (login/register) has been migrated to the User model.
// The Admin model is retained only for the approval workflow (verified flag, idCardFile, staffId).

import Admin from "../models/Admin.js";
import User from "../models/User.js";
import sendEmail from "../utils/sendEmail.js";
import crypto from "crypto";
import jwt from "jsonwebtoken";

const hashToken = (token) =>
    crypto.createHash("sha256").update(token).digest("hex");

/* ------------------------------------------------------------------
 🟩 REGISTER ADMIN — creates a pending Admin record (approval workflow)
    Active authentication happens via User model in authRoutes.
------------------------------------------------------------------ */
export const registerAdmin = async (req, res) => {
    try {
        const { name, email, staffId, department, password } = req.body;

        if (!name || !email || !staffId || !department || !password) {
            return res.status(400).json({
                message: "All fields (name, email, staffId, department, password) are required",
            });
        }

        if (!email.endsWith(".ac.in")) {
            return res
                .status(400)
                .json({ message: "Email must be a valid college email (.ac.in)" });
        }

        const existing = await Admin.findOne({ $or: [{ email }, { staffId }] });
        if (existing) {
            return res
                .status(400)
                .json({ message: "Admin already registered with this email or ID" });
        }

        const idCardFilePath = req.file ? `/uploads/idcards/${req.file.filename}` : null;

        const newAdmin = new Admin({
            name,
            email,
            staffId,
            department,
            password,
            role: "departmentadmin",
            idCardFile: idCardFilePath,
            verified: false,
        });

        await newAdmin.save();

        res.status(201).json({
            message:
                "Admin registration request submitted. Pending verification by Super Admin.",
            admin: {
                id: newAdmin._id,
                name: newAdmin.name,
                email: newAdmin.email,
                department: newAdmin.department,
                verified: newAdmin.verified,
            },
        });
    } catch (error) {
        console.error("Register Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

/* ------------------------------------------------------------------
 🟩 LOGIN ADMIN — authenticates against User model (source of truth)
    Falls back to Admin model only for the approval-state check.
------------------------------------------------------------------ */
export const loginAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        // ✅ FIX C-07: authenticate via User model, not Admin model
        const adminUser = await User.findOne({ email, role: { $in: ["admin", "superadmin"] } })
            .select("+password");

        if (!adminUser) {
            return res.status(404).json({ message: "Admin not found" });
        }

        // Cross-check approval state in the Admin (pending-request) collection
        const pendingRecord = await Admin.findOne({ email });
        if (pendingRecord && !pendingRecord.verified) {
            return res.status(403).json({ message: "Admin not verified by SuperAdmin" });
        }

        const isPasswordValid = await adminUser.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const accessToken = adminUser.generateAccessToken
            ? adminUser.generateAccessToken()
            : (() => {
                const jwt = (await import("jsonwebtoken")).default;
                return jwt.sign(
                    { _id: adminUser._id, email: adminUser.email, role: adminUser.role },
                    process.env.ACCESS_TOKEN_SECRET,
                    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "15m" }
                );
            })();

        // ✅ FIX MI-07: do NOT send refreshToken in response body — it stays server-side
        res.status(200).json({
            success: true,
            message: "Login successful",
            accessToken,
            admin: {
                _id: adminUser._id,
                name: adminUser.name,
                email: adminUser.email,
                department: adminUser.department,
                role: adminUser.role,
            },
            user: {
                _id: adminUser._id,
                name: adminUser.name,
                email: adminUser.email,
                department: adminUser.department,
                role: adminUser.role,
            },
        });
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

/* ------------------------------------------------------------------
 🟩 GET ALL PENDING ADMINS (SuperAdmin)
------------------------------------------------------------------ */
export const getPendingAdmins = async (req, res) => {
    try {
        const pending = await Admin.find({ verified: false }).select(
            "name email staffId department idCardFile createdAt"
        );
        res.status(200).json(pending);
    } catch (error) {
        console.error("Error fetching pending admins:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

/* ------------------------------------------------------------------
 🟩 GET ALL ADMINS (SuperAdmin) — reads from User model
    ✅ FIX C-07: was querying Admin model (parallel system)
------------------------------------------------------------------ */
export const getAllAdmins = async (req, res) => {
    try {
        // ✅ FIX C-07: query User model so superadmins see the real auth records
        const admins = await User.find({ role: { $in: ["admin", "superadmin"] } })
            .select("-password -refreshTokenHash")
            .populate("department", "name code");

        res.status(200).json({
            success: true,
            admins,
        });
    } catch (err) {
        console.error("Get all admins error:", err);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

/* ------------------------------------------------------------------
 🟩 APPROVE ADMIN (SuperAdmin)
    Marks the Admin (pending) record as verified and ensures a
    corresponding User record exists for authentication.
------------------------------------------------------------------ */
export const approveAdmin = async (req, res) => {
    try {
        const { id } = req.params;

        // Mark the pending request as approved
        const updated = await Admin.findByIdAndUpdate(
            id,
            { verified: true, role: "departmentadmin" },
            { new: true }
        ).select("-password -refreshToken -refreshTokenHash");

        if (!updated) {
            return res.status(404).json({ message: "Admin not found" });
        }

        // ✅ FIX C-07: ensure a User record exists so the admin can actually log in
        const existingUser = await User.findOne({ email: updated.email });
        if (!existingUser) {
            await User.create({
                name: updated.name,
                email: updated.email,
                password: crypto.randomBytes(16).toString("hex"), // temporary — admin must reset
                staffId: updated.staffId,
                department: updated.department,
                role: "admin",
                isVerified: true,
                isActive: true,
            });
        } else {
            existingUser.isVerified = true;
            existingUser.isActive = true;
            await existingUser.save({ validateBeforeSave: false });
        }

        await sendEmail({
            to: updated.email,
            subject: "🎉 Admin Approved - E-Grievance Hub",
            html: `
                <h2>Hello ${updated.name},</h2>
                <p>Your admin account has been approved.</p>
                <p>You can now login to the admin panel.</p>
            `,
        });

        res.status(200).json({
            message: "Admin approved successfully",
            admin: updated,
        });
    } catch (error) {
        console.error("Error approving admin:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

/* ------------------------------------------------------------------
 🟥 REJECT ADMIN (SuperAdmin)
    ✅ FIX M-07: was checking Admin model for deletion — correct, since
    reject removes the pending request. Also removes any pre-created
    User record to avoid orphaned auth accounts.
------------------------------------------------------------------ */
export const rejectAdmin = async (req, res) => {
    try {
        const { id } = req.params;

        const deleted = await Admin.findByIdAndDelete(id);
        if (!deleted) {
            return res.status(404).json({ message: "Admin not found" });
        }

        // ✅ FIX M-07: also remove from User model if a record was created prematurely
        await User.deleteOne({ email: deleted.email, role: "admin" });

        res.status(200).json({ message: "Admin rejected and removed", adminId: id });
    } catch (error) {
        console.error("Error rejecting admin:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};