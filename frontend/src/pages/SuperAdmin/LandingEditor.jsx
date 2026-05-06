import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import api from "../../api/axiosInstance";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Badge from "../../components/ui/Badge";

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

    if (!form) {
        return (
            <section className="space-y-4">
                <Card className="h-28 animate-pulse bg-gray-100" />
                <Card className="h-96 animate-pulse bg-gray-100" />
            </section>
        );
    }

    return (
        <section className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">Landing Page Editor</h1>
                    <p className="text-sm text-gray-600">Customize the student-facing landing page and preview changes live.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" onClick={() => save(false)}>Save Draft</Button>
                    <Button onClick={() => save(true)}>Save & Publish</Button>
                </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
                <div className="space-y-6">
                    <Card className="space-y-4">
                        <h2 className="text-lg font-semibold tracking-tight text-gray-900">Hero</h2>
                        <div className="grid gap-3 md:grid-cols-2">
                            <label className="grid gap-2 text-sm font-medium text-gray-700">University Name<Input value={form.universityName || ""} onChange={(e) => update({ universityName: e.target.value })} /></label>
                            <label className="grid gap-2 text-sm font-medium text-gray-700">Hero Title<Input value={form.heroTitle || ""} onChange={(e) => update({ heroTitle: e.target.value })} /></label>
                        </div>
                        <label className="grid gap-2 text-sm font-medium text-gray-700">Hero Subtitle<textarea className="ui-input min-h-20" value={form.heroSubtitle || ""} onChange={(e) => update({ heroSubtitle: e.target.value })} /></label>
                        <div className="grid gap-3 md:grid-cols-2">
                            <label className="grid gap-2 text-sm font-medium text-gray-700">Hero Background Image<input className="ui-input" type="file" accept="image/*" onChange={(e) => e.target.files[0] && uploadImage("heroImage", e.target.files[0])} /></label>
                            <label className="grid gap-2 text-sm font-medium text-gray-700">University Logo<input className="ui-input" type="file" accept="image/*" onChange={(e) => e.target.files[0] && uploadImage("universityLogo", e.target.files[0])} /></label>
                        </div>
                    </Card>

                    <Card className="space-y-4">
                        <div className="flex items-center justify-between gap-3">
                            <h2 className="text-lg font-semibold tracking-tight text-gray-900">Hero Slider Images</h2>
                            <label className="ui-btn-outline cursor-pointer">
                                Upload
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={async (e) => {
                                        if (!e.target.files?.[0]) return;
                                        try {
                                            const data = new FormData();
                                            data.append("image", e.target.files[0]);
                                            const res = await api.post("/landing-config/upload", data);
                                            const next = [...(form.sliderImages || []), res.data.url].slice(0, 8);
                                            update({ sliderImages: next });
                                            toast.success("Slider image added");
                                        } catch (error) {
                                            toast.error(error?.response?.data?.message || "Unable to upload slider image");
                                        } finally {
                                            e.target.value = "";
                                        }
                                    }}
                                />
                            </label>
                        </div>
                        <p className="text-sm text-gray-600">Add up to 8 rotating images for the public user landing page.</p>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {(form.sliderImages || []).map((url, index) => (
                                <article className="space-y-2 rounded-xl border border-gray-100 bg-gray-50 p-3" key={`${url}-${index}`}>
                                    <img src={url} alt={`Slider ${index + 1}`} className="h-28 w-full rounded-lg object-cover" />
                                    <Button
                                        variant="outline"
                                        className="w-full border-rose-200 text-rose-700 hover:bg-rose-50"
                                        onClick={() => update({ sliderImages: (form.sliderImages || []).filter((_, i) => i !== index) })}
                                    >
                                        Remove
                                    </Button>
                                </article>
                            ))}
                        </div>
                    </Card>

                    <Card className="space-y-4">
                        <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold tracking-tight text-gray-900">Feature Cards</h2><Button variant="outline" onClick={() => update({ features: [...features, emptyFeature].slice(0, 6) })}>Add</Button></div>
                        {features.map((feature, index) => (
                            <div className="grid gap-3 rounded-xl border border-gray-100 p-3 md:grid-cols-4" key={feature._id || index}>
                                <label className="grid gap-2 text-sm font-medium text-gray-700">Icon<Input value={feature.icon || ""} onChange={(e) => update({ features: features.map((item, i) => i === index ? { ...item, icon: e.target.value } : item) })} /></label>
                                <label className="grid gap-2 text-sm font-medium text-gray-700">Title<Input value={feature.title || ""} onChange={(e) => update({ features: features.map((item, i) => i === index ? { ...item, title: e.target.value } : item) })} /></label>
                                <label className="grid gap-2 text-sm font-medium text-gray-700">Description<Input value={feature.description || ""} onChange={(e) => update({ features: features.map((item, i) => i === index ? { ...item, description: e.target.value } : item) })} /></label>
                                <Button variant="outline" className="self-end border-rose-200 text-rose-700 hover:bg-rose-50" onClick={() => update({ features: features.filter((_, i) => i !== index) })}>Remove</Button>
                            </div>
                        ))}
                    </Card>

                    <Card className="space-y-4">
                        <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold tracking-tight text-gray-900">Announcements</h2><Button variant="outline" onClick={() => update({ announcements: [...announcements, emptyAnnouncement] })}>Add</Button></div>
                        {announcements.map((announcement, index) => (
                            <div className="space-y-3 rounded-xl border border-gray-100 p-3" key={announcement._id || index}>
                                <label className="grid gap-2 text-sm font-medium text-gray-700">Title<Input value={announcement.title || ""} onChange={(e) => update({ announcements: announcements.map((item, i) => i === index ? { ...item, title: e.target.value } : item) })} /></label>
                                <label className="grid gap-2 text-sm font-medium text-gray-700">Body<textarea className="ui-input min-h-20" value={announcement.body || ""} onChange={(e) => update({ announcements: announcements.map((item, i) => i === index ? { ...item, body: e.target.value } : item) })} /></label>
                                <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={announcement.isActive} onChange={(e) => update({ announcements: announcements.map((item, i) => i === index ? { ...item, isActive: e.target.checked } : item) })} /> Active</label>
                                <Button variant="outline" className="border-rose-200 text-rose-700 hover:bg-rose-50" onClick={() => update({ announcements: announcements.filter((_, i) => i !== index) })}>Remove</Button>
                            </div>
                        ))}
                    </Card>

                    <Card className="space-y-4">
                        <h2 className="text-lg font-semibold tracking-tight text-gray-900">Contact & About</h2>
                        <label className="grid gap-2 text-sm font-medium text-gray-700">About Text<textarea className="ui-input min-h-24" value={form.aboutText || ""} onChange={(e) => update({ aboutText: e.target.value })} /></label>
                        <div className="grid gap-3 md:grid-cols-2">
                            <label className="grid gap-2 text-sm font-medium text-gray-700">Contact Email<Input value={form.contactEmail || ""} onChange={(e) => update({ contactEmail: e.target.value })} /></label>
                            <label className="grid gap-2 text-sm font-medium text-gray-700">Contact Phone<Input value={form.contactPhone || ""} onChange={(e) => update({ contactPhone: e.target.value })} /></label>
                        </div>
                    </Card>
                </div>

                <Card className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                        <h2 className="text-lg font-semibold tracking-tight text-gray-900">Live Preview</h2>
                        <div className="flex gap-2">
                            <Button variant={previewMode === "desktop" ? "primary" : "outline"} onClick={() => setPreviewMode("desktop")}>Desktop</Button>
                            <Button variant={previewMode === "mobile" ? "primary" : "outline"} onClick={() => setPreviewMode("mobile")}>Mobile</Button>
                        </div>
                    </div>
                    <div className={`overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 ${previewMode === "mobile" ? "mx-auto max-w-sm" : ""}`}>
                        <LandingPreview config={previewConfig} />
                    </div>
                </Card>
            </div>
        </section>
    );
}

function LandingPreview({ config }) {
    return (
        <div className="space-y-4 p-4">
            <nav className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-4 py-3">
                <strong className="text-sm text-gray-900">{config.universityName}</strong>
                <div className="flex items-center gap-3 text-xs text-gray-600">
                    <span>Home</span><span>About</span><span>Contact</span><Button variant="outline" className="px-3 py-1 text-xs">Sign In</Button>
                </div>
            </nav>
            <section className="space-y-3 rounded-xl border border-gray-100 bg-white p-4">
                <h1 className="text-xl font-bold tracking-tight text-gray-900">{config.heroTitle}</h1>
                <p className="text-sm text-gray-600">{config.heroSubtitle}</p>
                <div className="flex gap-2"><Button className="px-3 py-1 text-xs">User Login</Button><Button variant="outline" className="px-3 py-1 text-xs">User Signup</Button></div>
            </section>
            {!!(config.sliderImages || []).length && (
                <section>
                    <Card><span className="text-sm text-gray-700">Slider Images: {(config.sliderImages || []).length}</span></Card>
                </section>
            )}
            <section className="grid gap-3 md:grid-cols-2">
                {(config.features || []).map((feature, index) => <article className="rounded-xl border border-gray-100 bg-white p-3" key={index}><h2 className="text-sm font-semibold text-gray-900">{feature.title}</h2><p className="text-xs text-gray-600">{feature.description}</p></article>)}
            </section>
            <div className="flex items-center gap-2">
                <Badge>Preview</Badge>
                <span className="text-xs text-gray-500">Draft mode</span>
            </div>
        </div>
    );
}
