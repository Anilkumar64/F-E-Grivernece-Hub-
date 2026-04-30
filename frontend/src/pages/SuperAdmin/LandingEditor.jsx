import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import api from "../../api/axiosInstance";

const emptyFeature = { icon: "FileText", title: "", description: "" };
const emptyAnnouncement = { title: "", body: "", isActive: true };

export default function LandingEditor() {
    const [form, setForm] = useState(null);
    const [previewMode, setPreviewMode] = useState("desktop");

    useEffect(() => {
        api.get("/landing-config").then((res) => setForm(res.data.config));
    }, []);

    const update = (patch) => setForm((current) => ({ ...current, ...patch }));
    const features = form?.features || [];
    const announcements = form?.announcements || [];

    const save = async (isPublished) => {
        try {
            const res = await api.put("/landing-config", { ...form, isPublished });
            setForm(res.data.config);
            toast.success(isPublished ? "Landing page published" : "Draft saved");
        } catch (error) {
            toast.error(error?.response?.data?.message || "Unable to save landing page");
        }
    };

    const uploadImage = async (field, file) => {
        const data = new FormData();
        data.append("image", file);
        const res = await api.post("/landing-config/upload", data);
        update({ [field]: res.data.url });
    };

    const previewConfig = useMemo(() => form, [form]);

    if (!form) return <section className="page-section"><div className="skeleton-stack"><div className="skeleton-card" /><div className="skeleton-card" /></div></section>;

    return (
        <section className="page-section">
            <div className="page-heading">
                <div>
                    <h1>Landing Page Editor</h1>
                    <p>Customize the student-facing landing page and preview changes live.</p>
                </div>
                <div className="split-actions">
                    <button className="secondary-btn" onClick={() => save(false)}>Save Draft</button>
                    <button className="primary-btn" onClick={() => save(true)}>Save & Publish</button>
                </div>
            </div>

            <div className="editor-grid">
                <div className="form-panel">
                    <div className="card">
                        <h2>Hero</h2>
                        <div className="form-grid">
                            <label>University Name<input value={form.universityName || ""} onChange={(e) => update({ universityName: e.target.value })} /></label>
                            <label>Hero Title<input value={form.heroTitle || ""} onChange={(e) => update({ heroTitle: e.target.value })} /></label>
                        </div>
                        <label>Hero Subtitle<textarea value={form.heroSubtitle || ""} onChange={(e) => update({ heroSubtitle: e.target.value })} /></label>
                        <div className="form-grid">
                            <label>Hero Background Image<input type="file" accept="image/*" onChange={(e) => e.target.files[0] && uploadImage("heroImage", e.target.files[0])} /></label>
                            <label>University Logo<input type="file" accept="image/*" onChange={(e) => e.target.files[0] && uploadImage("universityLogo", e.target.files[0])} /></label>
                        </div>
                    </div>

                    <div className="card">
                        <div className="page-heading"><h2>Feature Cards</h2><button className="secondary-btn" onClick={() => update({ features: [...features, emptyFeature].slice(0, 6) })}>Add</button></div>
                        {features.map((feature, index) => (
                            <div className="form-grid" key={feature._id || index}>
                                <label>Icon<input value={feature.icon || ""} onChange={(e) => update({ features: features.map((item, i) => i === index ? { ...item, icon: e.target.value } : item) })} /></label>
                                <label>Title<input value={feature.title || ""} onChange={(e) => update({ features: features.map((item, i) => i === index ? { ...item, title: e.target.value } : item) })} /></label>
                                <label>Description<input value={feature.description || ""} onChange={(e) => update({ features: features.map((item, i) => i === index ? { ...item, description: e.target.value } : item) })} /></label>
                                <button className="danger-btn" onClick={() => update({ features: features.filter((_, i) => i !== index) })}>Remove</button>
                            </div>
                        ))}
                    </div>

                    <div className="card">
                        <div className="page-heading"><h2>Announcements</h2><button className="secondary-btn" onClick={() => update({ announcements: [...announcements, emptyAnnouncement] })}>Add</button></div>
                        {announcements.map((announcement, index) => (
                            <div className="form-panel" key={announcement._id || index}>
                                <label>Title<input value={announcement.title || ""} onChange={(e) => update({ announcements: announcements.map((item, i) => i === index ? { ...item, title: e.target.value } : item) })} /></label>
                                <label>Body<textarea value={announcement.body || ""} onChange={(e) => update({ announcements: announcements.map((item, i) => i === index ? { ...item, body: e.target.value } : item) })} /></label>
                                <label><input type="checkbox" checked={announcement.isActive} onChange={(e) => update({ announcements: announcements.map((item, i) => i === index ? { ...item, isActive: e.target.checked } : item) })} /> Active</label>
                                <button className="danger-btn" onClick={() => update({ announcements: announcements.filter((_, i) => i !== index) })}>Remove</button>
                            </div>
                        ))}
                    </div>

                    <div className="card">
                        <h2>Contact & About</h2>
                        <label>About Text<textarea value={form.aboutText || ""} onChange={(e) => update({ aboutText: e.target.value })} /></label>
                        <div className="form-grid">
                            <label>Contact Email<input value={form.contactEmail || ""} onChange={(e) => update({ contactEmail: e.target.value })} /></label>
                            <label>Contact Phone<input value={form.contactPhone || ""} onChange={(e) => update({ contactPhone: e.target.value })} /></label>
                        </div>
                    </div>
                </div>

                <div className="card">
                    <div className="page-heading">
                        <h2>Live Preview</h2>
                        <div className="split-actions">
                            <button className={previewMode === "desktop" ? "primary-btn" : "secondary-btn"} onClick={() => setPreviewMode("desktop")}>Desktop</button>
                            <button className={previewMode === "mobile" ? "primary-btn" : "secondary-btn"} onClick={() => setPreviewMode("mobile")}>Mobile</button>
                        </div>
                    </div>
                    <div className={`preview-frame ${previewMode}`}>
                        <LandingPreview config={previewConfig} />
                    </div>
                </div>
            </div>
        </section>
    );
}

function LandingPreview({ config }) {
    return (
        <div className="landing">
            <nav className="public-nav"><strong>{config.universityName}</strong><div><span>Home</span><span>About</span><span>Contact</span><button className="secondary-btn">Sign In</button></div></nav>
            <section className="hero">
                <h1>{config.heroTitle}</h1>
                <p>{config.heroSubtitle}</p>
                <div><button className="primary-btn">Student Login</button><button className="secondary-btn">Admin Login</button></div>
            </section>
            <section className="features">
                {(config.features || []).map((feature, index) => <article key={index}><h2>{feature.title}</h2><p>{feature.description}</p></article>)}
            </section>
        </div>
    );
}
