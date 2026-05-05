import mongoose from "mongoose";

const complianceRequestSchema = new mongoose.Schema(
    {
        requestType: { type: String, enum: ["data_export", "data_delete"], required: true, index: true },
        subjectEmail: { type: String, required: true, trim: true, lowercase: true, index: true },
        subjectUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
        status: { type: String, enum: ["open", "in_progress", "completed", "rejected"], default: "open", index: true },
        reason: { type: String, required: true, trim: true },
        resultNote: { type: String, default: "" },
        requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        completedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    },
    { timestamps: true }
);

export default mongoose.model("ComplianceRequest", complianceRequestSchema);

