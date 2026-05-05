import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const ordinal = (value) => {
    const number = Number(value);
    if (!number) return "";
    const suffix = ["th", "st", "nd", "rd"];
    const mod100 = number % 100;
    return `${number}${suffix[(mod100 - 20) % 10] || suffix[mod100] || suffix[0]}`;
};

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
        studentId: { type: String, trim: true, unique: true, sparse: true },
        rollNumber: { type: String, trim: true, default: "" },
        class: { type: String, trim: true, default: "" },
        admissionYear: { type: Number, min: 1990, max: 2100, default: null },
        course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", default: null },
        staffId: { type: String, trim: true, sparse: true },
        department: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Department",
            default: null,
        },
        phone: { type: String, trim: true, default: "" },
        contactNumber: { type: String, trim: true, default: "" },
        alternateEmail: { type: String, trim: true, default: "" },
        address: { type: String, trim: true, default: "" },
        yearOfStudy: { type: String, trim: true, default: "" },
        avatar: { type: String, default: "" },
        profilePhoto: { type: String, default: "" },
        idCardFile: { type: String, default: null },   // stored path for admin ID-card upload
        isActive: { type: Boolean, default: true, index: true },
        isVerified: { type: Boolean, default: true, index: true },
        refreshTokenHash: { type: String, select: false, default: null },
        resetToken: { type: String, select: false, default: null },
        resetTokenExpire: { type: Date, select: false, default: null },
    },
    { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

userSchema.index({ role: 1, department: 1 });

userSchema.pre("validate", function (next) {
    if (this.role === "student" && !this.studentId) {
        this.invalidate("studentId", "Student ID is required for students");
    }
    if (this.role === "admin" && !this.staffId) {  // FIX B2: superadmin does not need staffId
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

// Primary password comparison method
userSchema.methods.comparePassword = function (password) {
    return bcrypt.compare(password, this.password);
};

// ✅ FIX M-02: userController calls matchPassword() but the method was named comparePassword.
// Add matchPassword as an alias so both callers work correctly.
userSchema.methods.matchPassword = function (password) {
    return this.comparePassword(password);
};

userSchema.virtual("currentYear").get(function () {
    if (!this.admissionYear) return this.yearOfStudy || "";
    const now = new Date();
    const academicYear = now.getMonth() + 1 >= 7 ? now.getFullYear() : now.getFullYear() - 1;
    const rawYear = Math.max(1, Math.floor(academicYear - this.admissionYear + 1));
    const duration = this.course?.durationYears || 8;
    return `${ordinal(Math.min(rawYear, duration))} Year`;
});

export default mongoose.model("User", userSchema);