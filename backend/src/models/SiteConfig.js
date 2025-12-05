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
    },
    { timestamps: true }
);

const SiteConfig = mongoose.model("SiteConfig", siteConfigSchema);

export default SiteConfig;
