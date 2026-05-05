import AuditLog from "../models/AuditLog.js";
import crypto from "crypto";
import SiteConfig from "../models/SiteConfig.js";

export const writeAuditLog = async (req, action, targetEntity, targetId = null, metadata = {}) => {
    try {
        const previous = await AuditLog.findOne().sort({ timestamp: -1 }).select("hash");
        const previousHash = previous?.hash || null;
        const payload = JSON.stringify({
            action,
            performedBy: req.user?._id?.toString() || null,
            targetEntity,
            targetId: targetId?.toString?.() || null,
            metadata,
            ipAddress: req.ip,
            previousHash,
        });
        const hash = crypto.createHash("sha256").update(payload).digest("hex");
        const cfg = await SiteConfig.findOne({ key: "global" }).select("audit.retentionDays");
        const retentionDays = cfg?.audit?.retentionDays || 365;
        const retentionUntil = new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000);

        await AuditLog.create({
            action,
            performedBy: req.user?._id || null,
            targetEntity,
            targetId,
            metadata,
            ipAddress: req.ip,
            previousHash,
            hash,
            retentionUntil,
        });
    } catch (error) {
        console.warn("Audit log failed:", error.message);
    }
};
