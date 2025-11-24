import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

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
            type: String,
            required: [true, "Department is required"],
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
        Refreshtoken: {
            type: String,
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
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

// 🔍 Compare passwords
adminSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password);
};

// 🔑 Generate tokens
adminSchema.methods.generateAccessToken = function () {
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
