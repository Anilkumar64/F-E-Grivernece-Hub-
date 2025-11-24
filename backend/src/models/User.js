import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Name is required"],
            trim: true,
        },

        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            lowercase: true,
            trim: true,
        },

        password: {
            type: String,
            required: [true, "Password is required"],
            minlength: 6,
        },

        role: {
            type: String,
            enum: ["student", "staff", "admin"],
            default: "student",
        },

        studentId: {
            type: String,
            default: null,
        },

        department: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Department",
            default: null,
        },

        phone: {
            type: String,
            default: null,
        },

        avatar: {
            type: String,
            default: null,
        },

        // Student ID card upload


        address: {
            type: String,
            default: null,
        },

        yearOfStudy: {
            type: String,
            default: null,
        },

        // OTP verification system


        // Forgot password OTP
        resetToken: {
            type: String,
            default: null,
        },

        resetTokenExpire: {
            type: Date,
            default: null,
        },

        // Track all grievances submitted by this user
        grievances: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Grievance",
            },
        ],
    },
    { timestamps: true }
);

//
// 🔐 Encrypt password before saving
//
userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

//
// 🔑 Compare password for login
//
userSchema.methods.matchPassword = async function (entered) {
    return await bcrypt.compare(entered, this.password);
};

export default mongoose.model("User", userSchema);
