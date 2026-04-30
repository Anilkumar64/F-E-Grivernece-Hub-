import AuditLog from "../models/AuditLog.js";

export const writeAuditLog = async (req, action, targetEntity, targetId = null, metadata = {}) => {
    try {
        await AuditLog.create({
            action,
            performedBy: req.user?._id || null,
            targetEntity,
            targetId,
            metadata,
            ipAddress: req.ip,
        });
    } catch (error) {
        console.warn("Audit log failed:", error.message);
    }
};
