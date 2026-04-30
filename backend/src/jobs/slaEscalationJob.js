import cron from "node-cron";
import Grievance from "../models/Grievance.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import AuditLog from "../models/AuditLog.js";

export const runSlaEscalation = async () => {
    const overdue = await Grievance.find({
        status: { $nin: ["Resolved", "Closed", "Escalated"] },
        slaDeadline: { $lt: new Date() },
        isEscalated: false,
    });

    if (!overdue.length) return;

    const superAdmins = await User.find({ role: "superadmin", isActive: true }).select("_id");

    for (const grievance of overdue) {
        grievance.status = "Escalated";
        grievance.isEscalated = true;
        grievance.escalatedAt = new Date();
        grievance.escalationReason = "SLA deadline exceeded";
        grievance.timeline.push({
            status: "Escalated",
            message: "Auto-escalated because SLA deadline was exceeded",
        });
        await grievance.save();

        await Notification.insertMany(superAdmins.map((admin) => ({
            recipient: admin._id,
            type: "grievance_escalated",
            message: `Grievance ${grievance.grievanceId} has breached SLA and was escalated.`,
            grievance: grievance._id,
        })));

        await AuditLog.create({
            action: "GRIEVANCE_AUTO_ESCALATED",
            targetEntity: "Grievance",
            targetId: grievance._id,
            metadata: { grievanceId: grievance.grievanceId },
        });
    }
};

export const startSlaEscalationJob = () => {
    cron.schedule("*/30 * * * *", () => {
        runSlaEscalation().catch((error) => console.error("SLA escalation failed:", error));
    });
};
