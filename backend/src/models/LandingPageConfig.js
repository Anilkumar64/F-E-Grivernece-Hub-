import mongoose from "mongoose";

const featureSchema = new mongoose.Schema(
    {
        icon: { type: String, default: "FileText" },
        title: { type: String, trim: true, default: "" },
        description: { type: String, trim: true, default: "" },
    },
    { _id: true }
);

const announcementSchema = new mongoose.Schema(
    {
        title: { type: String, trim: true, default: "" },
        body: { type: String, trim: true, default: "" },
        isActive: { type: Boolean, default: true },
        createdAt: { type: Date, default: Date.now },
    },
    { _id: true }
);

const landingPageConfigSchema = new mongoose.Schema(
    {
        key: { type: String, unique: true, default: "student-landing" },
        universityName: { type: String, trim: true, default: "University E-Grievance" },
        universityLogo: { type: String, trim: true, default: "" },
        heroTitle: { type: String, trim: true, default: "Submit. Track. Resolve." },
        heroSubtitle: { type: String, trim: true, default: "A transparent grievance platform for students and campus administrators." },
        heroImage: { type: String, trim: true, default: "" },
        features: {
            type: [featureSchema],
            default: () => [
                { icon: "Send", title: "Submit Grievances", description: "Raise academic, hostel, finance, or campus issues with supporting evidence." },
                { icon: "Search", title: "Track Progress", description: "Follow status changes, comments, and SLA timelines from one place." },
                { icon: "CheckCircle", title: "Get Resolution", description: "Stay notified until your concern is reviewed and resolved." },
            ],
        },
        announcements: { type: [announcementSchema], default: () => [] },
        contactEmail: { type: String, trim: true, default: "support@university.ac.in" },
        contactPhone: { type: String, trim: true, default: "" },
        aboutText: { type: String, trim: true, default: "We help students raise concerns clearly and help teams resolve them responsibly." },
        isPublished: { type: Boolean, default: true },
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    },
    { timestamps: true }
);

export default mongoose.model("LandingPageConfig", landingPageConfigSchema);
