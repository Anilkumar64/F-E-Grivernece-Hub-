import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcryptjs from "bcryptjs";

const adminSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Admin name is required"],
            trim: true,
        },
        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            lowercase: true,
            trim: true,
            validate: {
                validator: function (value) {
                    // ✅ FIX MO-01: Original regex /^[\w-\.]+@[\w-]+\.(ac\.in)$/ rejected valid
                    // international college emails like admin@cs.university.ac.in (multiple subdomains)
                    // or admin@university.edu.in. Broadened to allow any subdomain depth ending in .ac.in
                    // while still keeping it a reasonable college-domain check.
                    return /^[\w.+-]+@([\w-]+\.)+ac\.in$/.test(value);
                },
                message: "Email must be a valid college email (.ac.in)",
            },
        },
        staffId: {
            type: String,
            required: [true, "Staff ID is required"],
            unique: true,
            trim: true,
        },
        department: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Department",
            required: function () {
                return this.role !== "superadmin";
            },
            default: null,
        },
        role: {
            type: String,
            enum: ["superadmin", "departmentadmin"],
            default: "departmentadmin",
        },
        password: {
            type: String,
            required: [true, "Password is required"],
            minlength: [8, "Password must be at least 8 characters long"],
        },
        idCardFile: {
            type: String,
        },
        refreshToken: {
            type: String,
            default: null,
        },
        refreshTokenHash: {
            type: String,
            default: null,
            select: false,
        },
        verified: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

// 🔒 Encrypt password before saving
adminSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    this.password = await bcryptjs.hash(this.password, 10);
    next();
});

// 🔍 Compare passwords
adminSchema.methods.isPasswordCorrect = async function (password) {
    return await bcryptjs.compare(password, this.password);
};

// 🔑 Generate access token
adminSchema.methods.generateAccessToken = function () {
    if (!process.env.ACCESS_TOKEN_SECRET || process.env.ACCESS_TOKEN_SECRET.length < 32) {
        throw new Error("ACCESS_TOKEN_SECRET must be at least 32 characters");
    }

    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            role: this.role,
            // tokenType omitted intentionally — access tokens are identified by their short expiry
        },
        process.env.ACCESS_TOKEN_SECRET,
        // ✅ FIX MI-11: provide a safe default so the token never gets infinite expiry
        { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "15m" }
    );
};

// 🔑 Generate refresh token
adminSchema.methods.generateRefreshToken = function () {
    if (!process.env.REFRESH_TOKEN_SECRET || process.env.REFRESH_TOKEN_SECRET.length < 32) {
        throw new Error("REFRESH_TOKEN_SECRET must be at least 32 characters");
    }

    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            role: this.role,
            // ✅ FIX C-03: legacy generateRefreshToken omitted tokenType claim.
            // Adding it lets authMiddleware distinguish refresh tokens from access tokens
            // and reject refresh tokens presented as access tokens (and vice-versa).
            tokenType: "refresh",
        },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: process.env.REFRESH_TOKEN_EXPIRY || "7d" }
    );
};

const Admin = mongoose.model("Admin", adminSchema);
export default Admin;