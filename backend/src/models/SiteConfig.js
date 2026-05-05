import mongoose from "mongoose";

const bannerSchema = new mongoose.Schema(
    {
        enabled: { type: Boolean, default: false },
        message: { type: String, default: "" },
    },
    { _id: false }
);

const landingSchema = new mongoose.Schema(
    {
        heroTitle: { type: String, default: "A smarter way to handle" },
        heroHighlight: { type: String, default: " student grievances" },
        subtitle: {
            type: String,
            default:
                "E-Grievance Hub is a unified platform where students can safely raise issues, admins can manage cases efficiently, and superadmins can monitor campus-wide well-being in real time.",
        },
        pillText: {
            type: String,
            default: "🎓 Campus · 🛡 Transparency · ⚡ Fast Resolution",
        },
        primaryCtaLabel: { type: String, default: "Get Started" },
        primaryCtaLink: { type: String, default: "/signup" },
        secondaryCtaLabel: { type: String, default: "Track Complaint" },
        secondaryCtaLink: { type: String, default: "/track-grievance" },
    },
    { _id: false }
);

const siteConfigSchema = new mongoose.Schema(
    {
        // keep it singleton by convention
        key: { type: String, unique: true, default: "global" },
        landing: { type: landingSchema, default: () => ({}) },
        adminBanner: { type: bannerSchema, default: () => ({}) },
        superAdminBanner: { type: bannerSchema, default: () => ({}) },
        security: {
            maxLoginAttempts: { type: Number, default: 5 },
            lockoutMinutes: { type: Number, default: 15 },
            stepUpWindowMinutes: { type: Number, default: 10 },
        },
        audit: {
            retentionDays: { type: Number, default: 365 },
            integrityChainEnabled: { type: Boolean, default: true },
        },
        reporting: {
            defaultRangeDays: { type: Number, default: 30 },
            allowCsvExport: { type: Boolean, default: true },
        },
        sla: {
            escalationHours: { type: Number, default: 48 },
            warningHours: { type: Number, default: 24 },
        },
        roleTemplates: {
            type: [{
                name: { type: String, required: true },
                description: { type: String, default: "" },
                permissions: { type: [String], default: [] },
            }],
            default: [
                { name: "Operations Admin", description: "Operational handling and escalations", permissions: ["grievance.read.department", "grievance.update.department", "grievance.assign", "grievance.escalate", "reports.read"] },
                { name: "Audit Reviewer", description: "Read audit/reporting modules", permissions: ["reports.read", "audit.verify"] },
                { name: "Read-only Analyst", description: "Read-only access for analytics", permissions: ["reports.read", "users.read"] },
            ],
        },
        notificationPolicies: {
            lockoutAlerts: { type: Boolean, default: true },
            escalationAlerts: { type: Boolean, default: true },
            adminSignupAlerts: { type: Boolean, default: true },
            slaBreachAlerts: { type: Boolean, default: true },
            emailEnabled: { type: Boolean, default: true },
            inAppEnabled: { type: Boolean, default: true },
        },
        messageTemplates: {
            lockoutAlert: { type: String, default: "Account {email} was locked after repeated failed login attempts." },
            escalationAlert: { type: String, default: "Grievance {grievanceId} was escalated." },
            adminSignupAlert: { type: String, default: "New admin signup pending approval: {email}" },
            slaBreachAlert: { type: String, default: "SLA breach detected for grievance {grievanceId}." },
        },
        slaMatrix: {
            type: [{
                category: { type: mongoose.Schema.Types.ObjectId, ref: "GrievanceCategory", default: null },
                priority: { type: String, enum: ["Low", "Medium", "High", "Critical"], required: true },
                responseHours: { type: Number, default: 24 },
                resolutionHours: { type: Number, default: 72 },
                escalationRecipients: { type: [mongoose.Schema.Types.ObjectId], ref: "User", default: [] },
            }],
            default: [],
        },
    },
    { timestamps: true }
);

const SiteConfig = mongoose.model("SiteConfig", siteConfigSchema);

export default SiteConfig;
