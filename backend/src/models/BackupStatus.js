import mongoose from "mongoose";

const backupStatusSchema = new mongoose.Schema(
    {
        environment: { type: String, default: "production", index: true },
        status: { type: String, enum: ["healthy", "warning", "critical"], default: "healthy" },
        lastSuccessfulBackupAt: { type: Date, default: null },
        nextScheduledBackupAt: { type: Date, default: null },
        provider: { type: String, default: "mongodb-atlas" },
        restoreRunbookUrl: { type: String, default: "" },
        notes: { type: String, default: "" },
    },
    { timestamps: true }
);

export default mongoose.model("BackupStatus", backupStatusSchema);

