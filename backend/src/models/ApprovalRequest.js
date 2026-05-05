import mongoose from "mongoose";

const approvalRequestSchema = new mongoose.Schema(
    {
        actionType: { type: String, required: true, index: true },
        targetEntity: { type: String, required: true },
        targetId: { type: mongoose.Schema.Types.ObjectId, default: null },
        reason: { type: String, required: true, trim: true, maxlength: 1000 },
        payload: { type: mongoose.Schema.Types.Mixed, default: {} },
        requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
        approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
        status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending", index: true },
        decisionNote: { type: String, trim: true, default: "" },
        expiresAt: { type: Date, default: () => new Date(Date.now() + 60 * 60 * 1000), index: true },
    },
    { timestamps: true }
);

export default mongoose.model("ApprovalRequest", approvalRequestSchema);

