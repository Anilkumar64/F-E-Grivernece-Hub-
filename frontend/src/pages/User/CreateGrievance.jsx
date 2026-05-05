import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Copy, FileText, X } from "lucide-react";
import api from "../../api/axiosInstance";
import AuthContext from "../../context/AuthCore";

const DRAFT_KEY = "student_grievance_draft_v1";
const DRAFTS_KEY = "student_grievance_drafts_v2";

export default function CreateGrievance() {
    const navigate = useNavigate();
    const location = useLocation();
    const { authUser } = React.useContext(AuthContext);
    const [categories, setCategories] = useState([]);
    const [form, setForm] = useState({
        title: "",
        description: "",
        category: "",
        priority: "Medium",
        isAcademicUrgent: false,
        urgentReason: "",
    });
    const [files, setFiles] = useState([]);
    const [submitted, setSubmitted] = useState(null);
    const [loadingCategories, setLoadingCategories] = useState(false);
    const [activeDraftId, setActiveDraftId] = useState(null);

    useEffect(() => {
        let active = true;
        setLoadingCategories(true);
        const departmentId = authUser?.department?._id || authUser?.department || "";
        const url = departmentId ? `/categories?department=${departmentId}` : "/categories";
        api.get(url)
            .then(async (res) => {
                const list = Array.isArray(res.data) ? res.data : (res.data.categories || []);
                if (!active) return;
                if (list.length > 0 || !departmentId) {
                    setCategories(list);
                    return;
                }
                // Fallback: if department-specific categories are empty, load all categories.
                const allRes = await api.get("/categories");
                const allList = Array.isArray(allRes.data) ? allRes.data : (allRes.data.categories || []);
                if (active) setCategories(allList);
            })
            .catch(() => toast.error("Unable to load categories"))
            .finally(() => {
                if (active) setLoadingCategories(false);
            });

        return () => {
            active = false;
        };
    }, [authUser?.department]);

    useEffect(() => {
        try {
            const params = new URLSearchParams(location.search);
            const draftId = params.get("draft");
            const listRaw = localStorage.getItem(DRAFTS_KEY);
            const list = listRaw ? JSON.parse(listRaw) : [];
            const selected = draftId ? list.find((d) => d.id === draftId) : null;
            const fallbackRaw = localStorage.getItem(DRAFT_KEY);
            const fallback = fallbackRaw ? JSON.parse(fallbackRaw) : null;
            const draft = selected || fallback;
            if (!draft || typeof draft !== "object") return;
            setActiveDraftId(draft.id || null);
            setForm((prev) => ({
                ...prev,
                title: draft.title || "",
                description: draft.description || "",
                category: draft.category || "",
                priority: draft.priority || "Medium",
                isAcademicUrgent: Boolean(draft.isAcademicUrgent),
                urgentReason: draft.urgentReason || "",
            }));
            toast.success("Loaded saved grievance draft");
        } catch {
            // ignore malformed draft
        }
    }, [location.search]);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            localStorage.setItem(
                DRAFT_KEY,
                JSON.stringify({
                    title: form.title,
                    description: form.description,
                    category: form.category,
                    priority: form.priority,
                    isAcademicUrgent: form.isAcademicUrgent,
                    urgentReason: form.urgentReason,
                    updatedAt: Date.now(),
                })
            );
        }, 400);
        return () => window.clearTimeout(timer);
    }, [form]);

    const descriptionCount = form.description.length;
    const suggestedCategory = useMemo(() => {
        if (!categories.length || form.category) return null;
        const haystack = `${form.title} ${form.description}`.toLowerCase().trim();
        if (!haystack) return null;

        const scored = categories
            .map((c) => {
                const name = `${c.name || ""} ${c.description || ""} ${c.department?.name || ""}`.toLowerCase();
                const tokens = name.split(/[^a-z0-9]+/).filter((t) => t.length > 2);
                const score = tokens.reduce((acc, token) => (haystack.includes(token) ? acc + 1 : acc), 0);
                return { category: c, score };
            })
            .sort((a, b) => b.score - a.score);

        return scored[0]?.score > 0 ? scored[0].category : null;
    }, [categories, form.title, form.description, form.category]);

    const valid = useMemo(
        () => form.title.trim().length > 0 && form.title.length <= 100 && descriptionCount >= 50 && form.category,
        [form, descriptionCount]
    );

    const addFiles = (incoming) => {
        const accepted = Array.from(incoming).filter(
            (f) => ["application/pdf", "image/jpeg", "image/png"].includes(f.type) && f.size <= 5 * 1024 * 1024
        );
        if (accepted.length !== incoming.length) toast("Only PDF, JPG, PNG under 5 MB are allowed");
        setFiles((cur) => [...cur, ...accepted].slice(0, 3));
    };
    const validations = [
        { label: "Title", ok: Boolean(form.title.trim()) },
        { label: "Description (50+ chars)", ok: form.description.length >= 50 },
        { label: "Category", ok: Boolean(form.category) },
        { label: "Urgency reason", ok: !form.isAcademicUrgent || Boolean(form.urgentReason.trim()) },
    ];

    const submit = async (e) => {
        e.preventDefault();
        if (!form.title.trim()) return toast.error("Title is required");
        if (form.description.length < 50) return toast.error("Description must be at least 50 characters");
        if (!form.category) return toast.error("Please select a category");
        if (form.isAcademicUrgent && !form.urgentReason.trim()) return toast.error("Urgency reason is required for urgent grievances");
        const data = new FormData();
        Object.entries(form).forEach(([key, value]) => data.append(key, value));
        files.forEach((file) => data.append("attachments", file));
        try {
            const res = await api.post("/grievances", data);
            setSubmitted(res.data.grievance);
            localStorage.removeItem(DRAFT_KEY);
            const draftListRaw = localStorage.getItem(DRAFTS_KEY);
            const draftList = draftListRaw ? JSON.parse(draftListRaw) : [];
            if (activeDraftId) {
                localStorage.setItem(DRAFTS_KEY, JSON.stringify(draftList.filter((d) => d.id !== activeDraftId)));
            }
            toast.success("Grievance submitted");
        } catch (error) {
            toast.error(error?.response?.data?.message || "Failed to submit grievance");
        }
    };

    const saveDraftNow = () => {
        const id = activeDraftId || `draft-${Date.now()}`;
        setActiveDraftId(id);
        const draftObj = {
            id,
            title: form.title,
            description: form.description,
            category: form.category,
            priority: form.priority,
            isAcademicUrgent: form.isAcademicUrgent,
            urgentReason: form.urgentReason,
            updatedAt: Date.now(),
        };
        const raw = localStorage.getItem(DRAFTS_KEY);
        const list = raw ? JSON.parse(raw) : [];
        const next = [draftObj, ...list.filter((d) => d.id !== id)];
        localStorage.setItem(DRAFTS_KEY, JSON.stringify(next.slice(0, 20)));
        localStorage.setItem(
            DRAFT_KEY,
            JSON.stringify(draftObj)
        );
        toast.success("Draft saved");
    };

    const clearDraft = () => {
        localStorage.removeItem(DRAFT_KEY);
        setForm({
            title: "",
            description: "",
            category: "",
            priority: "Medium",
            isAcademicUrgent: false,
            urgentReason: "",
        });
        setFiles([]);
        toast.success("Draft cleared");
    };

    if (submitted) {
        return (
            <section className="page-section">
                <div className="card">
                    <h1>Grievance Submitted</h1>
                    <p>Your grievance has been recorded successfully.</p>
                    <p className="muted">
                        Assigned Department: {submitted.department?.name || "-"} | Estimated SLA:{" "}
                        {submitted.slaDeadline ? new Date(submitted.slaDeadline).toLocaleString() : "-"}
                    </p>
                    <p className="muted">Next: department admin reviews your grievance and updates timeline/comments.</p>
                    <button className="id-badge" onClick={() => navigator.clipboard.writeText(submitted.grievanceId)}>
                        <Copy size={14} /> {submitted.grievanceId}
                    </button>
                    <div className="split-actions">
                        <button className="primary-btn" onClick={() => navigate(`/grievance/${submitted.grievanceId}`)}>View Details</button>
                        <button className="secondary-btn" onClick={() => navigate("/my-grievances")}>My Grievances</button>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className="page-section">
            <div className="page-heading">
                <div>
                    <h1>Submit Grievance</h1>
                    <p>Provide clear details so the right department can respond quickly.</p>
                </div>
                <div className="split-actions">
                    <button type="button" className="secondary-btn" onClick={saveDraftNow}>Save Draft</button>
                    <button type="button" className="ghost-btn" onClick={clearDraft}>Clear Draft</button>
                </div>
            </div>
            <form className="form-panel" onSubmit={submit}>
                <div className="card" style={{ padding: 12 }}>
                    <strong>Form Validation</strong>
                    <div className="file-list" style={{ marginTop: 8 }}>
                        {validations.map((v) => (
                            <span key={v.label} className={`pill ${v.ok ? "success" : "danger"}`}>{v.label}</span>
                        ))}
                    </div>
                </div>
                <label>Title<input maxLength={100} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></label>
                <label>Description<textarea minLength={50} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required /></label>
                <p className={descriptionCount < 50 ? "muted" : "pill success"}>{descriptionCount}/50 minimum characters</p>
                <div className="form-grid">
                    <label>Category
                        <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required>
                            <option value="">Select category</option>
                            {categories.map((c) => <option key={c._id} value={c._id}>{c.name} - {c.department?.name}</option>)}
                        </select>
                        {suggestedCategory && (
                            <small className="muted">
                                Suggested category: <strong>{suggestedCategory.name}</strong>{" "}
                                <button
                                    type="button"
                                    className="ghost-btn"
                                    onClick={() => setForm({ ...form, category: suggestedCategory._id })}
                                >
                                    Use Suggestion
                                </button>
                            </small>
                        )}
                        {loadingCategories && <small className="muted">Loading categories...</small>}
                        {!categories.length && (
                            <small className="muted">
                                No categories found for your department. Please contact admin/superadmin to add complaint categories.
                            </small>
                        )}
                    </label>
                    <label>Priority
                        <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                            {["Low", "Medium", "High", "Critical"].map((p) => <option key={p}>{p}</option>)}
                        </select>
                    </label>
                </div>
                <label>
                    <input
                        type="checkbox"
                        checked={form.isAcademicUrgent}
                        onChange={(e) => setForm({ ...form, isAcademicUrgent: e.target.checked })}
                    />
                    Mark as urgent academic issue (placement/exam/hall-ticket/fee blocker)
                </label>
                {form.isAcademicUrgent && (
                    <label>Urgency Reason
                        <textarea
                            maxLength={300}
                            placeholder="Briefly explain why this needs urgent handling..."
                            value={form.urgentReason}
                            onChange={(e) => setForm({ ...form, urgentReason: e.target.value })}
                        />
                    </label>
                )}
                <label>Supporting Evidence
                    <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => addFiles(e.target.files)} />
                </label>
                <div className="file-list">
                    {files.map((file, i) => (
                        <span className="pill" key={`${file.name}-${i}`}>
                            <FileText size={14} /> {file.name} ({Math.max(1, Math.round(file.size / 1024))} KB)
                            <button type="button" className="ghost-btn" onClick={() => setFiles(files.filter((_, j) => j !== i))}><X size={14} /></button>
                        </span>
                    ))}
                </div>
                <button className="primary-btn">Submit Grievance</button>
            </form>
        </section>
    );
}