import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Copy, FileText, X, Sparkles, Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import api from "../../api/axiosInstance";
import AuthContext from "../../context/AuthCore";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Badge from "../../components/ui/Badge";

const DRAFT_KEY = "student_grievance_draft_v1";
const DRAFTS_KEY = "student_grievance_drafts_v2";

/* ── AI Panel ────────────────────────────────────────────────────────────── */
const SENTIMENT_COLORS = {
    positive: "bg-emerald-50 text-emerald-700",
    neutral: "bg-gray-100 text-gray-700",
    negative: "bg-amber-50 text-amber-700",
    distressed: "bg-rose-50 text-rose-700",
};
const PRIORITY_COLORS = {
    Low: "bg-blue-50 text-blue-700",
    Medium: "bg-amber-50 text-amber-700",
    High: "bg-orange-50 text-orange-700",
    Critical: "bg-rose-50 text-rose-700",
};

function AiPanel({ title, description, onApplyPriority, onApplyImproved }) {
    const [analysing, setAnalysing] = useState(false);
    const [improving, setImproving] = useState(false);
    const [analysis, setAnalysis] = useState(null);
    const [improved, setImproved] = useState("");
    const [duplicates, setDuplicates] = useState([]);
    const [showDuplicates, setShowDuplicates] = useState(false);

    const canAnalyze = title.trim().length >= 5 && description.length >= 50;

    const analyze = useCallback(async () => {
        if (!canAnalyze) return;
        setAnalysing(true);
        try {
            const [analyzeRes, dupRes] = await Promise.all([
                api.post("/ai/analyze", { title, description }),
                api.post("/ai/duplicates", { title, description }),
            ]);
            if (analyzeRes.data.available !== false) setAnalysis(analyzeRes.data);
            if (dupRes.data.available !== false && dupRes.data.matches?.length)
                setDuplicates(dupRes.data.matches);
        } catch {
            toast.error("AI analysis unavailable");
        } finally {
            setAnalysing(false);
        }
    }, [title, description, canAnalyze]);

    const improve = useCallback(async () => {
        if (description.length < 50) return;
        setImproving(true);
        try {
            const res = await api.post("/ai/improve", { description });
            if (res.data.available !== false && res.data.improved_description) {
                setImproved(res.data.improved_description);
            }
        } catch {
            toast.error("AI improvement unavailable");
        } finally {
            setImproving(false);
        }
    }, [description]);

    return (
        <Card className="space-y-4 border-indigo-100 bg-gradient-to-br from-indigo-50/60 to-purple-50/40">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-indigo-600" />
                    <span className="text-sm font-semibold text-indigo-900">AI Assistant</span>
                </div>
                <div className="flex gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        className="gap-1.5 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                        onClick={analyze}
                        disabled={!canAnalyze || analysing}
                    >
                        {analysing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                        Analyze
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        className="gap-1.5 border-purple-200 text-purple-700 hover:bg-purple-50"
                        onClick={improve}
                        disabled={description.length < 50 || improving}
                    >
                        {improving ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                        Improve
                    </Button>
                </div>
            </div>

            {!canAnalyze && (
                <p className="text-xs text-indigo-500">
                    Fill title + description (50+ chars) to enable AI analysis.
                </p>
            )}

            {/* Mental health / content warning */}
            {analysis?.mental_health_risk && analysis.mental_health_risk !== "none" && (
                <div className="flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">
                    <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                    <div>
                        <strong>Mental Health Signal Detected ({analysis.mental_health_risk} risk)</strong>
                        <p className="text-xs">Your grievance will be flagged for priority attention. Please reach out to counseling services if needed.</p>
                    </div>
                </div>
            )}
            {analysis?.content_flags?.length > 0 && (
                <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
                    <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                    Content flags: {analysis.content_flags.join(", ")} — please ensure your grievance is respectful and factual.
                </div>
            )}

            {/* Analysis result */}
            {analysis?.available && (
                <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                        {analysis.suggested_category && (
                            <Badge className="bg-indigo-100 text-indigo-800">
                                Category: {analysis.suggested_category}
                            </Badge>
                        )}
                        {analysis.suggested_priority && (
                            <button
                                type="button"
                                onClick={() => onApplyPriority?.(analysis.suggested_priority)}
                                className={`inline-flex cursor-pointer items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-opacity hover:opacity-80 ${PRIORITY_COLORS[analysis.suggested_priority]}`}
                            >
                                Priority: {analysis.suggested_priority} ↑ Apply
                            </button>
                        )}
                        {analysis.sentiment && (
                            <Badge className={SENTIMENT_COLORS[analysis.sentiment] || "bg-gray-100 text-gray-700"}>
                                Sentiment: {analysis.sentiment}
                            </Badge>
                        )}
                        {analysis.urgency_flags?.length > 0 && (
                            <Badge className="bg-rose-100 text-rose-800">
                                ⚡ {analysis.urgency_flags.join(", ")}
                            </Badge>
                        )}
                    </div>
                    {analysis.summary && (
                        <p className="rounded-lg bg-white/70 p-2.5 text-xs text-gray-700 italic">
                            "{analysis.summary}"
                        </p>
                    )}
                    {analysis.reasoning && (
                        <p className="text-xs text-indigo-600">
                            <strong>AI reasoning:</strong> {analysis.reasoning}
                        </p>
                    )}
                </div>
            )}

            {/* Duplicate warning */}
            {duplicates.length > 0 && (
                <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
                    <button
                        type="button"
                        className="flex w-full items-center justify-between text-sm font-semibold text-amber-800"
                        onClick={() => setShowDuplicates((v) => !v)}
                    >
                        <span>⚠️ {duplicates.length} similar grievance{duplicates.length > 1 ? "s" : ""} already exist</span>
                        <span className="text-xs">{showDuplicates ? "Hide" : "Show"}</span>
                    </button>
                    {showDuplicates && (
                        <div className="space-y-1.5">
                            {duplicates.map((d) => (
                                <div key={d.grievance_id} className="rounded-lg bg-white/80 p-2 text-xs text-gray-700">
                                    <strong>{d.grievance_id}</strong> — {d.title}
                                    <span className="ml-2 text-gray-500">({d.status}) · {Math.round(d.similarity * 100)}% match</span>
                                </div>
                            ))}
                            <p className="text-xs text-amber-700">You can still submit if your issue is different.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Improved description */}
            {improved && (
                <div className="space-y-2 rounded-xl border border-purple-200 bg-white/80 p-3">
                    <p className="text-xs font-semibold text-purple-800">✨ AI-improved description:</p>
                    <p className="text-xs text-gray-700 leading-relaxed">{improved}</p>
                    <Button
                        type="button"
                        variant="outline"
                        className="border-purple-200 text-purple-700 hover:bg-purple-50 text-xs"
                        onClick={() => { onApplyImproved?.(improved); setImproved(""); }}
                    >
                        Apply improved description
                    </Button>
                </div>
            )}
        </Card>
    );
}

/* ── Main Component ──────────────────────────────────────────────────────── */
export default function CreateGrievance() {
    const navigate = useNavigate();
    const location = useLocation();
    const { authUser } = React.useContext(AuthContext);
    const [departments, setDepartments] = useState([]);
    const [form, setForm] = useState({
        title: "",
        description: "",
        department: "",
        priority: "Medium",
        isAcademicUrgent: false,
        urgentReason: "",
    });
    const [files, setFiles] = useState([]);
    const [submitted, setSubmitted] = useState(null);
    const [loadingDepartments, setLoadingDepartments] = useState(false);
    const [activeDraftId, setActiveDraftId] = useState(null);

    useEffect(() => {
        let active = true;
        const t = window.setTimeout(() => {
            setLoadingDepartments(true);
            api.get("/departments")
                .then((res) => {
                    if (!active) return;
                    const list = Array.isArray(res.data) ? res.data : [];
                    setDepartments(list.filter((d) => d.isActive !== false));
                })
                .catch(() => toast.error("Unable to load departments"))
                .finally(() => { if (active) setLoadingDepartments(false); });
        }, 0);
        return () => { active = false; window.clearTimeout(t); };
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
            const t = window.setTimeout(() => {
                setActiveDraftId(draft.id || null);
                setForm((prev) => ({
                    ...prev,
                    title: draft.title || "",
                    description: draft.description || "",
                    department: draft.department || "",
                    priority: draft.priority || "Medium",
                    isAcademicUrgent: Boolean(draft.isAcademicUrgent),
                    urgentReason: draft.urgentReason || "",
                }));
                toast.success("Loaded saved grievance draft");
            }, 0);
            return () => window.clearTimeout(t);
        } catch { /* ignore malformed draft */ }
    }, [location.search]);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...form, updatedAt: Date.now() }));
        }, 400);
        return () => window.clearTimeout(timer);
    }, [form]);

    const descriptionCount = form.description.length;
    const valid = useMemo(
        () => form.title.trim().length > 0 && form.title.length <= 100 && descriptionCount >= 50 && form.department,
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
        { label: "Department", ok: Boolean(form.department) },
        { label: "Urgency reason", ok: !form.isAcademicUrgent || Boolean(form.urgentReason.trim()) },
    ];

    const submit = async (e) => {
        e.preventDefault();
        if (!form.title.trim()) return toast.error("Title is required");
        if (form.description.length < 50) return toast.error("Description must be at least 50 characters");
        if (!form.department) return toast.error("Please select a department");
        if (form.isAcademicUrgent && !form.urgentReason.trim()) return toast.error("Urgency reason is required");
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
        const draftObj = { id, ...form, updatedAt: Date.now() };
        const raw = localStorage.getItem(DRAFTS_KEY);
        const list = raw ? JSON.parse(raw) : [];
        localStorage.setItem(DRAFTS_KEY, JSON.stringify([draftObj, ...list.filter((d) => d.id !== id)].slice(0, 20)));
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draftObj));
        toast.success("Draft saved");
    };

    const clearDraft = () => {
        localStorage.removeItem(DRAFT_KEY);
        setForm({ title: "", description: "", department: "", priority: "Medium", isAcademicUrgent: false, urgentReason: "" });
        setFiles([]);
        toast.success("Draft cleared");
    };

    if (submitted) {
        return (
            <section className="space-y-6">
                <Card className="space-y-4">
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">Grievance Submitted</h1>
                    <p className="text-sm text-gray-700">Your grievance has been recorded successfully.</p>
                    <p className="text-sm text-gray-600">
                        Assigned Department: {submitted.department?.name || "–"} | Estimated SLA:{" "}
                        {submitted.slaDeadline ? new Date(submitted.slaDeadline).toLocaleString() : "–"}
                    </p>
                    <p className="text-sm text-gray-600">Next: department admin reviews your grievance and updates timeline/comments.</p>
                    <button className="inline-flex w-fit items-center gap-2 rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-700" type="button" onClick={() => navigator.clipboard.writeText(submitted.grievanceId)}>
                        <Copy size={14} /> {submitted.grievanceId}
                    </button>
                    <div className="flex gap-3">
                        <Button onClick={() => navigate(`/grievance/${submitted.grievanceId}`)}>View Details</Button>
                        <Button variant="outline" onClick={() => navigate("/my-grievances")}>My Grievances</Button>
                    </div>
                </Card>
            </section>
        );
    }

    return (
        <section className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">Submit Grievance</h1>
                    <p className="text-sm text-gray-600">Provide clear details so the right department can respond quickly.</p>
                </div>
                <div className="flex gap-3">
                    <Button type="button" variant="outline" onClick={saveDraftNow}>Save Draft</Button>
                    <Button type="button" variant="ghost" onClick={clearDraft}>Clear Draft</Button>
                </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
                <form className="space-y-4" onSubmit={submit}>
                    <Card className="space-y-2 p-4">
                        <strong className="text-sm text-gray-900">Form Validation</strong>
                        <div className="flex flex-wrap gap-2">
                            {validations.map((v) => (
                                <Badge key={v.label} className={v.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}>{v.label}</Badge>
                            ))}
                        </div>
                    </Card>
                    <Card className="space-y-4">
                        <label className="grid gap-2 text-sm font-medium text-gray-700">Title
                            <Input maxLength={100} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                        </label>
                        <label className="grid gap-2 text-sm font-medium text-gray-700">Description
                            <textarea className="ui-input min-h-28" minLength={50} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
                        </label>
                        <p className={descriptionCount < 50 ? "text-sm text-gray-500" : "inline-flex w-fit rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700"}>{descriptionCount}/50 minimum characters</p>
                        <div className="grid gap-3 md:grid-cols-2">
                            <label className="grid gap-2 text-sm font-medium text-gray-700">Department
                                <select className="ui-input" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} required>
                                    <option value="">Select department</option>
                                    {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
                                </select>
                                {loadingDepartments && <small className="text-xs text-gray-500">Loading departments...</small>}
                                {!departments.length && <small className="text-xs text-gray-500">No departments found. Please contact admin/superadmin.</small>}
                            </label>
                            <label className="grid gap-2 text-sm font-medium text-gray-700">Priority
                                <select className="ui-input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                                    {["Low", "Medium", "High", "Critical"].map((p) => <option key={p}>{p}</option>)}
                                </select>
                            </label>
                        </div>
                        <label className="flex items-center gap-2 text-sm text-gray-700">
                            <input type="checkbox" checked={form.isAcademicUrgent} onChange={(e) => setForm({ ...form, isAcademicUrgent: e.target.checked })} />
                            Mark as urgent academic issue (placement/exam/hall-ticket/fee blocker)
                        </label>
                        {form.isAcademicUrgent && (
                            <label className="grid gap-2 text-sm font-medium text-gray-700">Urgency Reason
                                <textarea className="ui-input min-h-24" maxLength={300} placeholder="Briefly explain why this needs urgent handling..." value={form.urgentReason} onChange={(e) => setForm({ ...form, urgentReason: e.target.value })} />
                            </label>
                        )}
                        <label className="grid gap-2 text-sm font-medium text-gray-700">Supporting Evidence
                            <Input type="file" multiple accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => addFiles(e.target.files)} />
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {files.map((file, i) => (
                                <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700" key={`${file.name}-${i}`}>
                                    <FileText size={14} /> {file.name} ({Math.max(1, Math.round(file.size / 1024))} KB)
                                    <button type="button" className="text-gray-500 hover:text-gray-700" onClick={() => setFiles(files.filter((_, j) => j !== i))}><X size={14} /></button>
                                </span>
                            ))}
                        </div>
                        <Button disabled={!valid}>Submit Grievance</Button>
                    </Card>
                </form>

                {/* AI Panel sidebar */}
                <div>
                    <AiPanel
                        title={form.title}
                        description={form.description}
                        onApplyPriority={(p) => setForm((f) => ({ ...f, priority: p }))}
                        onApplyImproved={(text) => setForm((f) => ({ ...f, description: text }))}
                    />
                </div>
            </div>
        </section>
    );
}