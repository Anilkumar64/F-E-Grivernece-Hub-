import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const superAdminSchema = new mongoose.Schema(
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
        role: { type: String, enum: ["superadmin"], default: "superadmin", immutable: true, index: true },
        staffId: { type: String, trim: true, default: "SA-HQ-0001", sparse: true },
        department: { type: mongoose.Schema.Types.ObjectId, ref: "Department", default: null },
        phone: { type: String, trim: true, default: "" },
        contactNumber: { type: String, trim: true, default: "" },
        alternateEmail: { type: String, trim: true, default: "" },
        address: { type: String, trim: true, default: "" },
        avatar: { type: String, default: "" },
        profilePhoto: { type: String, default: "" },
        isActive: { type: Boolean, default: true, index: true },
        isVerified: { type: Boolean, default: true, index: true },
        refreshTokenHash: { type: String, select: false, default: null },
        resetToken: { type: String, select: false, default: null },
        resetTokenExpire: { type: Date, select: false, default: null },
        permissions: { type: [String], default: [] },
        loginAttempts: { type: Number, default: 0, select: false },
        lockUntil: { type: Date, default: null, select: false },
        lastFailedLoginAt: { type: Date, default: null, select: false },
        stepUpCodeHash: { type: String, default: null, select: false },
        stepUpCodeExpiresAt: { type: Date, default: null, select: false },
        stepUpVerifiedAt: { type: Date, default: null, select: false },
        activeSessions: {
            type: [{
                sessionId: { type: String, required: true },
                userAgent: { type: String, default: "" },
                ipAddress: { type: String, default: "" },
                lastSeenAt: { type: Date, default: Date.now },
                createdAt: { type: Date, default: Date.now },
            }],
            default: [],
            select: false,
        },
    },
    { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

superAdminSchema.pre("validate", function (next) {
    this.department = null;
    if (!this.staffId) this.staffId = "SA-HQ-0001";
    next();
});

superAdminSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

superAdminSchema.methods.comparePassword = function (password) {
    return bcrypt.compare(password, this.password);
};

superAdminSchema.methods.matchPassword = function (password) {
    return this.comparePassword(password);
};

export default mongoose.model("SuperAdmin", superAdminSchema);
