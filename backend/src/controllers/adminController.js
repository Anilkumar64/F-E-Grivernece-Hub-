import Admin from "../models/Admin.js";
import sendEmail from "../utils/sendEmail.js";
import jwt from "jsonwebtoken";


// await sendEmail({
//     to: updated.email,
//     subject: "🎉 Admin Approved - E-Griverence Hub",
//     html: `
//     <h2>Hello ${updated.name || updated.username},</h2>
//     <p>Your admin account has been approved by the SuperAdmin.</p>
//     <p>You may now login and manage grievances.</p>
//     <br/>
//     <p>Regards,<br>E-Griverence Hub Team</p>
//   `,
// });

export const registerAdmin = async (req, res) => {
    try {
        const { name, email, staffId, department, password, role } = req.body;

        // 1️⃣ Validate required fields
        if (!name || !email || !staffId || !department || !password) {
            return res.status(400).json({
                message:
                    "All fields (name, email, staffId, department, password) are required",
            });
        }

        // 2️⃣ Ensure email domain ends with ".ac.in"
        if (!email.endsWith(".ac.in")) {
            return res
                .status(400)
                .json({ message: "Email must be a valid college email (.ac.in)" });
        }

        // 3️⃣ Check if admin already exists
        const existing = await Admin.findOne({ $or: [{ email }, { staffId }] });
        if (existing) {
            return res
                .status(400)
                .json({ message: "Admin already registered with this email or ID" });
        }

        // 4️⃣ Handle file upload (if ID card uploaded)
        const idCardFilePath = req.file ? `/uploads/idcards/${req.file.filename}` : null;

        // 5️⃣ Create new admin entry
        const newAdmin = new Admin({
            name,
            email,
            staffId,
            department,
            password,
            role: role || "departmentadmin",
            idCardFile: idCardFilePath,
            verified: false,
        });

        await newAdmin.save();

        // 6️⃣ Response
        res.status(201).json({
            message:
                "Admin registration request submitted successfully. Pending verification by Super Admin.",
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


export const loginAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1️⃣ Validate inputs
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        // 2️⃣ Find admin using EMAIL (correct field)
        const adminUser = await Admin.findOne({ email });

        if (!adminUser) {
            return res.status(404).json({ message: "Admin not found" });
        }

        // 3️⃣ Check if admin is verified by superadmin
        if (!adminUser.verified) {
            return res.status(403).json({ message: "Admin not verified by SuperAdmin" });
        }

        // 4️⃣ Check password
        const isPasswordValid = await adminUser.isPasswordCorrect(password);

        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // 5️⃣ Generate tokens
        const accessToken = adminUser.generateAccessToken();
        const refreshToken = adminUser.generateRefreshToken();

        // 6️⃣ Save refresh token in DB
        adminUser.refreshToken = refreshToken;
        await adminUser.save({ validateBeforeSave: false });

        // 7️⃣ Send response
        res.status(200).json({
            success: true,
            message: "Login successful",
            accessToken,
            refreshToken,
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

// /* ------------------------------------------------------------------
//  🟩 APPROVE ADMIN (SuperAdmin)
export const getAllAdmins = async (req, res) => {
    try {
        const admins = await Admin.find().populate("department", "name");

        res.status(200).json({
            success: true,
            admins,
        });
    } catch (err) {
        console.error("Get all admins error:", err);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

// ------------------------------------------------------------------ */
export const approveAdmin = async (req, res) => {
    try {
        const { id } = req.params;

        const updated = await Admin.findByIdAndUpdate(
            id,
            { verified: true },
            { new: true }
        );

        if (!updated) {
            return res.status(404).json({ message: "Admin not found" });
        }

        // 📩 Send approval email
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
------------------------------------------------------------------ */
export const rejectAdmin = async (req, res) => {
    try {
        const { id } = req.params;

        const deleted = await Admin.findByIdAndDelete(id);

        if (!deleted) {
            return res.status(404).json({ message: "Admin not found" });
        }

        res
            .status(200)
            .json({ message: "Admin rejected and removed ❌", adminId: id });
    } catch (error) {
        console.error("Error rejecting admin:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};
