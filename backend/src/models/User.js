import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true, maxlength: 120 },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email address"],
        },
        password: { type: String, required: true, minlength: 8, select: false },
        role: {
            type: String,
            enum: ["student", "admin", "superadmin"],
            required: true,
            default: "student",
            index: true,
        },
        studentId: { type: String, trim: true, sparse: true },
        staffId: { type: String, trim: true, sparse: true },
        department: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Department",
            default: null,
        },
        phone: { type: String, trim: true, default: "" },
        address: { type: String, trim: true, default: "" },
        yearOfStudy: { type: String, trim: true, default: "" },
        avatar: { type: String, default: "" },
        isActive: { type: Boolean, default: true, index: true },
        refreshTokenHash: { type: String, select: false, default: null },
        resetToken: { type: String, select: false, default: null },
        resetTokenExpire: { type: Date, select: false, default: null },
    },
    { timestamps: true }
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ staffId: 1 }, { unique: true, sparse: true });
userSchema.index({ studentId: 1 }, { unique: true, sparse: true });
userSchema.index({ role: 1, department: 1 });

userSchema.pre("validate", function (next) {
    if (this.role === "student" && !this.studentId) {
        this.invalidate("studentId", "Student ID is required for students");
    }
    if ((this.role === "admin" || this.role === "superadmin") && !this.staffId) {
        this.invalidate("staffId", "Staff ID is required for admins");
    }
    if (this.role === "admin" && !this.department) {
        this.invalidate("department", "Department is required for department admins");
    }
    if (this.role === "superadmin") {
        this.department = null;
    }
    next();
});

userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

userSchema.methods.comparePassword = function (password) {
    return bcrypt.compare(password, this.password);
};

export default mongoose.model("User", userSchema);
