import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const adminSchema = new mongoose.Schema(
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
        role: { type: String, enum: ["admin"], default: "admin", immutable: true, index: true },
        staffId: { type: String, required: true, trim: true, unique: true, sparse: true },
        department: { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true, index: true },
        phone: { type: String, trim: true, default: "" },
        contactNumber: { type: String, trim: true, default: "" },
        alternateEmail: { type: String, trim: true, default: "" },
        address: { type: String, trim: true, default: "" },
        avatar: { type: String, default: "" },
        profilePhoto: { type: String, default: "" },
        idCardFile: { type: String, default: null },
        isActive: { type: Boolean, default: true, index: true },
        isVerified: { type: Boolean, default: false, index: true },
        refreshTokenHash: { type: String, select: false, default: null },
        resetToken: { type: String, select: false, default: null },
        resetTokenExpire: { type: Date, select: false, default: null },
        permissions: { type: [String], default: [] },
        skills: { type: [String], default: [] },
        isCounselor: { type: Boolean, default: false },
        lastAssignedAt: { type: Date, default: null },
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

adminSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

adminSchema.methods.comparePassword = function (password) {
    return bcrypt.compare(password, this.password);
};

adminSchema.methods.matchPassword = function (password) {
    return this.comparePassword(password);
};

export default mongoose.model("Admin", adminSchema);
