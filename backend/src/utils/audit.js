import mongoose from "mongoose";
import AuditLog, { AUDIT_RETENTION_DAYS } from "../models/AuditLog.js";
import crypto from "crypto";

const actorModelByRole = {
    student: "User",
    admin: "Admin",
    superadmin: "SuperAdmin",
};

const asObjectIdOrNull = (value) => {
    if (!value) return null;
    const raw = value?.toString?.() || value;
    return mongoose.Types.ObjectId.isValid(raw) ? raw : null;
};

export const writeAuditLog = async (req, action, targetEntity, targetId = null, metadata = {}) => {
    try {
        const previous = await AuditLog.findOne().sort({ timestamp: -1 }).select("hash");
        const previousHash = previous?.hash || null;
        const actorRole = req.role || req.user?.role || "";
        const performedByModel = actorModelByRole[actorRole] || null;
        const safeTargetId = asObjectIdOrNull(targetId);
        const actor = {
            name: req.user?.name || "",
            email: req.user?.email || "",
            role: actorRole,
        };
        const payload = JSON.stringify({
            action,
            performedBy: req.user?._id?.toString() || null,
            performedByModel,
            actor,
            targetEntity,
            targetId: safeTargetId,
            metadata,
            ipAddress: req.ip,
            previousHash,
        });
        const hash = crypto.createHash("sha256").update(payload).digest("hex");
        const retentionUntil = new Date(Date.now() + AUDIT_RETENTION_DAYS * 24 * 60 * 60 * 1000);

        await AuditLog.create({
            action,
            performedBy: req.user?._id || null,
            performedByModel,
            actor,
            targetEntity,
            targetId: safeTargetId,
            metadata,
            ipAddress: req.ip,
            userAgent: req.headers?.["user-agent"] || "",
            sessionId: req.headers?.["x-session-id"] || "",
            previousHash,
            hash,
            retentionUntil,
        });
    } catch (error) {
        console.warn("Audit log failed:", error.message);
    }
};
