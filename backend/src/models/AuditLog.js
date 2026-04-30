import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
    {
        action: { type: String, required: true, index: true },
        performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
        targetEntity: { type: String, required: true, index: true },
        targetId: { type: mongoose.Schema.Types.ObjectId, default: null },
        metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
        ipAddress: { type: String, default: "" },
        timestamp: { type: Date, default: Date.now, index: true },
    },
    { versionKey: false }
);

export default mongoose.model("AuditLog", auditLogSchema);
