import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Sparkles, Loader2, Brain, AlertTriangle, TrendingUp, Copy } from "lucide-react";
import api from "../../api/axiosInstance";
import Skeleton from "../../components/common/Skeleton";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";

/* ── AI Summary Card ─────────────────────────────────────────────────────── */
const SENTIMENT_CONFIG = {
    positive:   { color: "bg-emerald-100 text-emerald-800", label: "Positive" },
    neutral:    { color: "bg-gray-100 text-gray-700",       label: "Neutral" },
    negative:   { color: "bg-amber-100 text-amber-800",     label: "Negative" },
    distressed: { color: "bg-rose-100 text-rose-800",       label: "Distressed ⚠️" },
};

const RISK_CONFIG = {
    none:     { color: "bg-gray-100 text-gray-600",     icon: null },
    low:      { color: "bg-blue-100 text-blue-700",     icon: null },
    medium:   { color: "bg-amber-100 text-amber-800",   icon: "⚠️" },
    high:     { color: "bg-rose-100 text-rose-800",     icon: "🚨" },
    critical: { color: "bg-rose-200 text-rose-900",     icon: "🚨" },
};

function AiSummaryCard({ grievanceMongoId }) {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState(null);
    const [fetched, setFetched] = useState(false);

    useEffect(() => {
        if (!grievanceMongoId || fetched) return;
        setFetched(true);
        setLoading(true);
        api.get(`/ai/summary/${grievanceMongoId}`)
            .then((res) => { if (res.data.available !== false) setData(res.data); })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [grievanceMongoId, fetched]);

    if (loading) return (
        <div className="flex items-center gap-2 rounded-xl bg-indigo-50 p-3 text-sm text-indigo-600">
            <Loader2 size={14} className="animate-spin" /> Generating AI summary…
        </div>
    );
    if (!data) return null;

    const sentiment = SENTIMENT_CONFIG[data.sentiment] || SENTIMENT_CONFIG.neutral;
    const risk = RISK_CONFIG[data.urgency_level] || RISK_CONFIG.none;

    return (
        <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-purple-50/40 p-4 space-y-3">
            <div className="flex items-center gap-2">
                <Brain size={15} className="text-indigo-600" />
                <span className="text-xs font-semibold text-indigo-800">AI Summary</span>
            </div>
            <p className="text-sm text-gray-700 italic leading-relaxed">"{data.summary}"</p>
            {data.key_issue && (
                <p className="text-xs text-indigo-700"><strong>Key issue:</strong> {data.key_issue}</p>
            )}
            <div className="flex flex-wrap gap-2">
                <Badge className={sentiment.color}>Sentiment: {sentiment.label}</Badge>
                {data.urgency_level && data.urgency_level !== "low" && (
                    <Badge className={risk.color}>
                        {risk.icon} Urgency: {data.urgency_level}
                    </Badge>
                )}
            </div>
        </div>
    );
}

/* ── Suggest Response ────────────────────────────────────────────────────── */
function SuggestResponseButton({ grievanceMongoId, onInsert }) {
    const [loading, setLoading] = useState(false);

    const suggest = async () => {
        setLoading(true);
        try {
            const res = await api.post("/ai/suggest-response", { grievance_mongo_id: grievanceMongoId });
            if (res.data.available !== false && res.data.draft) {
                onInsert(res.data.draft);
                toast.success("AI response suggestion inserted");
            } else {
                toast.error("AI suggestions unavailable");
            }
        } catch {
            toast.error("AI suggestions unavailable");
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            type="button"
            onClick={suggest}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-60 transition-colors"
        >
            {loading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            Suggest Response
        </button>
    );
}

/* ── SLA Risk Badge ──────────────────────────────────────────────────────── */
function SlaRiskBadge({ grievanceMongoId }) {
    const [risk, setRisk] = useState(null);

    useEffect(() => {
        api.get("/ai/sla-risk")
            .then((res) => {
                const item = res.data.items?.find((i) => i.mongo_id === grievanceMongoId);
                if (item) setRisk(item);
            })
            .catch(() => {});
    }, [grievanceMongoId]);

    if (!risk || risk.risk_label === "safe") return null;

    const configs = {
        warning: "bg-amber-100 text-amber-800",
        danger:  "bg-orange-100 text-orange-800",
        breached:"bg-rose-100 text-rose-800",
    };

    return (
        <Badge className={configs[risk.risk_label] || "bg-gray-100 text-gray-600"}>
            <TrendingUp size={11} className="mr-1" />
            SLA {risk.risk_label} ({risk.hours_remaining > 0 ? `${risk.hours_remaining}h left` : "overdue"})
        </Badge>
    );
}

/* ── Main Component ──────────────────────────────────────────────────────── */
export default function AdminGrievanceDetails() {
    const { id } = useParams();
    const [grievance, setGrievance] = useState(null);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState("");
    const [message, setMessage] = useState("");
    const [comment, setComment] = useState("");
    const [reopenDecision, setReopenDecision] = useState("approved");
    const [reopenReason, setReopenReason] = useState("");

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get(`/grievances/${id}`);
            setGrievance(res.data.grievance);
            setStatus(res.data.grievance.status);
        } catch (error) {
            toast.error(error?.response?.data?.message || "Unable to load grievance");
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { load(); }, [load]);

    const updateStatus = async (e) => {
        e.preventDefault();
        if (!message.trim()) return toast.error("Status comment is required");
        await api.patch(`/grievances/${grievance._id}/status`, { status, message });
        toast.success("Status updated");
        setMessage("");
        load();
    };

    const reply = async (e) => {
        e.preventDefault();
        if (!comment.trim()) return;
        await api.post(`/grievances/${grievance._id}/comments`, { text: comment });
        setComment("");
        load();
    };

    const reviewReopen = async (e) => {
        e.preventDefault();
        await api.patch(`/grievances/${grievance._id}/reopen-decision`, {
            decision: reopenDecision,
            reason: reopenReason,
        });
        toast.success("Reopen request reviewed");
        setReopenReason("");
        load();
    };

    if (loading) return <Skeleton rows={4} />;
    if (!grievance) return <Card>Grievance not found</Card>;

    return (
        <section className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
                <div className="space-y-6">
                    <Card className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-700"
                                type="button"
                                onClick={() => navigator.clipboard.writeText(grievance.grievanceId)}
                            >
                                <Copy size={12} /> {grievance.grievanceId}
                            </button>
                            <SlaRiskBadge grievanceMongoId={grievance._id} />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900">{grievance.title}</h1>
                        <div className="flex flex-wrap gap-2">
                            <Badge>{grievance.status}</Badge>
                            <Badge className="bg-gray-100 text-gray-700">{grievance.priority}</Badge>
                            {grievance.isAcademicUrgent && <Badge className="bg-rose-50 text-rose-700">Academic Urgent</Badge>}
                            {/* Show AI sentiment if available */}
                            {grievance.aiMetadata?.sentiment && (
                                <Badge className={SENTIMENT_CONFIG[grievance.aiMetadata.sentiment]?.color || "bg-gray-100 text-gray-600"}>
                                    {grievance.aiMetadata.sentiment}
                                </Badge>
                            )}
                        </div>
                        <p className="text-sm text-gray-600">
                            Student: {grievance.submittedBy?.name} · {grievance.submittedBy?.email}
                        </p>
                        <p className="text-sm text-gray-700">{grievance.description}</p>

                        {/* AI Summary */}
                        <AiSummaryCard grievanceMongoId={grievance._id} />
                    </Card>

                    <form className="ui-card space-y-4" onSubmit={updateStatus}>
                        <h2 className="text-lg font-semibold tracking-tight text-gray-900">Update Status</h2>
                        <div className="grid gap-3 md:grid-cols-2">
                            <label className="grid gap-2 text-sm font-medium text-gray-700">
                                Status
                                <select className="ui-input" value={status} onChange={(e) => setStatus(e.target.value)}>
                                    {["Pending", "UnderReview", "InProgress", "Resolved", "Escalated", "Closed"].map((item) => <option key={item}>{item}</option>)}
                                </select>
                            </label>
                            <label className="grid gap-2 text-sm font-medium text-gray-700">
                                Assigned Admin
                                <input className="ui-input" value={grievance.assignedTo?.name || "Current department queue"} readOnly />
                            </label>
                        </div>
                        <label className="grid gap-2 text-sm font-medium text-gray-700">
                            Required Comment
                            <textarea className="ui-input min-h-24" value={message} onChange={(e) => setMessage(e.target.value)} />
                        </label>
                        <Button>Update Status</Button>
                    </form>

                    {grievance.reopenRequested && (
                        <form className="ui-card space-y-4" onSubmit={reviewReopen}>
                            <h2 className="text-lg font-semibold tracking-tight text-gray-900">Reopen Request Review</h2>
                            <p className="text-sm text-gray-600">{grievance.reopenReason || "No reason provided."}</p>
                            <div className="grid gap-3 md:grid-cols-2">
                                <label className="grid gap-2 text-sm font-medium text-gray-700">Decision
                                    <select className="ui-input" value={reopenDecision} onChange={(e) => setReopenDecision(e.target.value)}>
                                        <option value="approved">Approve</option>
                                        <option value="rejected">Reject</option>
                                    </select>
                                </label>
                                <label className="grid gap-2 text-sm font-medium text-gray-700">Reason
                                    <input className="ui-input" value={reopenReason} onChange={(e) => setReopenReason(e.target.value)} />
                                </label>
                            </div>
                            <Button>Submit Decision</Button>
                        </form>
                    )}

                    <Card className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold tracking-tight text-gray-900">Discussion</h2>
                            <SuggestResponseButton
                                grievanceMongoId={grievance._id}
                                onInsert={(draft) => setComment(draft)}
                            />
                        </div>
                        {(grievance.comments || []).map((item) => (
                            <div className="rounded-xl border border-gray-100 bg-gray-50 p-3" key={item._id}>
                                <strong className="text-sm text-gray-900">{item.postedBy?.name || item.role}</strong>
                                <p className="text-sm text-gray-700">{item.text}</p>
                                <span className="text-xs text-gray-500">{new Date(item.timestamp).toLocaleString()}</span>
                            </div>
                        ))}
                        <form className="grid gap-3 md:grid-cols-[1fr_auto]" onSubmit={reply}>
                            <textarea
                                className="ui-input min-h-24"
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                placeholder="Reply to student…"
                            />
                            <Button>Reply</Button>
                        </form>
                    </Card>
                </div>

                <aside className="space-y-4">
                    <Card className="space-y-3">
                        <h2 className="text-lg font-semibold tracking-tight text-gray-900">Audit Timeline</h2>
                        {(grievance.timeline || []).map((item) => (
                            <div className="rounded-xl border border-gray-100 bg-gray-50 p-3" key={item._id}>
                                <strong className="text-sm text-gray-900">{item.status}</strong>
                                <p className="text-sm text-gray-700">{item.message || "Status updated"}</p>
                                <span className="text-xs text-gray-500">{new Date(item.timestamp).toLocaleString()}</span>
                            </div>
                        ))}
                    </Card>
                </aside>
            </div>
        </section>
    );
}
