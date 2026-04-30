import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcryptjs from "bcryptjs";
// const ALLOWED_DEPARTMENTS = ["IT", "CSE", "ECE", "EEE", "MECH", "CIVIL"];

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
                    // ✅ Must be college domain like ".ac.in"
                    return /^[\w-\.]+@[\w-]+\.(ac\.in)$/.test(value);
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
            minlength: [6, "Password must be at least 6 characters long"],
        },
        idCardFile: {
            type: String, // file URL or path (like /uploads/idcards/...)
        },
        // ✅ Fixed: Changed from Refreshtoken to refreshToken for consistent camelCase naming
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
            default: false, // Set to true after admin verification
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

// 🔑 Generate tokens
adminSchema.methods.generateAccessToken = function () {
    if (!process.env.ACCESS_TOKEN_SECRET || process.env.ACCESS_TOKEN_SECRET.length < 32) {
        throw new Error("ACCESS_TOKEN_SECRET must be at least 32 characters");
    }

    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            role: this.role,
        },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
    );
};

adminSchema.methods.generateRefreshToken = function () {
    if (!process.env.REFRESH_TOKEN_SECRET || process.env.REFRESH_TOKEN_SECRET.length < 32) {
        throw new Error("REFRESH_TOKEN_SECRET must be at least 32 characters");
    }

    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            role: this.role,
        },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: process.env.REFRESH_TOKEN_EXPIRY }
    );
};

const Admin = mongoose.model("Admin", adminSchema);
export default Admin;
