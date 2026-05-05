import mongoose from "mongoose";

const securityEventSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            enum: ["account_locked", "repeated_failed_login", "unusual_activity", "force_logout", "temporary_block"],
            required: true,
            index: true,
        },
        severity: { type: String, enum: ["low", "medium", "high", "critical"], default: "medium" },
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
        message: { type: String, required: true, trim: true },
        metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
        status: { type: String, enum: ["open", "investigating", "resolved"], default: "open", index: true },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    },
    { timestamps: true }
);

export default mongoose.model("SecurityEvent", securityEventSchema);

