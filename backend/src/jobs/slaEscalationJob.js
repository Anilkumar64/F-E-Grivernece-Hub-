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
    }).populate("submittedBy", "_id email name")
        .populate("assignedTo", "_id email name");

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

        // Build notification recipients list
        const notificationsToCreate = [];

        // 1. Superadmins — same as before
        superAdmins.forEach((admin) => {
            notificationsToCreate.push({
                recipient: admin._id,
                type: "grievance_escalated",
                title: "SLA Breach — Grievance Escalated",
                message: `Grievance ${grievance.grievanceId} has breached SLA and was auto-escalated.`,
                grievance: grievance._id,
            });
        });

        // ✅ FIX MO-05: also notify the student who submitted the grievance
        if (grievance.submittedBy?._id) {
            notificationsToCreate.push({
                recipient: grievance.submittedBy._id,
                type: "grievance_escalated",
                title: "Your grievance has been escalated",
                message: `Your grievance ${grievance.grievanceId} exceeded the SLA deadline and has been escalated for urgent review.`,
                grievance: grievance._id,
            });
        }

        // ✅ FIX MO-05: also notify the assigned admin (if any)
        if (
            grievance.assignedTo?._id &&
            !superAdmins.some((sa) => sa._id.equals(grievance.assignedTo._id))
        ) {
            notificationsToCreate.push({
                recipient: grievance.assignedTo._id,
                type: "grievance_escalated",
                title: "Assigned grievance escalated due to SLA breach",
                message: `Grievance ${grievance.grievanceId} assigned to you has been auto-escalated — SLA deadline was missed.`,
                grievance: grievance._id,
            });
        }

        if (notificationsToCreate.length) {
            await Notification.insertMany(notificationsToCreate);
        }

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