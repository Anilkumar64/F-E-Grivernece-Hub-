import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Download, Send } from "lucide-react";
import api from "../../api/axiosInstance";
import Skeleton from "../../components/common/Skeleton";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Badge from "../../components/ui/Badge";

const apiOrigin = (import.meta.env.VITE_API_URL || "").trim();
const resolveUrl = (path) => (apiOrigin ? `${apiOrigin}${path}` : path);

export default function TrackGrievance() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [grievance, setGrievance] = useState(null);
    const [loading, setLoading] = useState(true);
    const [trackingId, setTrackingId] = useState("");
    const [comment, setComment] = useState("");
    const [rating, setRating] = useState(5);
    const [submittingComment, setSubmittingComment] = useState(false);
    const [submittingFeedback, setSubmittingFeedback] = useState(false);
    const [requestingReopen, setRequestingReopen] = useState(false);
    const [reopenReason, setReopenReason] = useState("");
    const [evidenceFiles, setEvidenceFiles] = useState([]);
    const [uploadingEvidence, setUploadingEvidence] = useState(false);
    const [downloadingPdf, setDownloadingPdf] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [recentIds, setRecentIds] = useState([]);

    const load = useCallback(async (showLoader = true) => {
        if (showLoader) setLoading(true);
        try {
            const res = await api.get(`/grievances/${id}`);
            setGrievance(res.data.grievance);
        } catch (error) {
            toast.error(error?.response?.data?.message || "Unable to load grievance");
        } finally {
            if (showLoader) setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        if (!id) {
            setLoading(false);
            api.get("/grievances/mine?limit=20").then((res) => {
                const rows = res.data.grievances || [];
                setSuggestions(rows.map((r) => r.grievanceId).filter(Boolean));
            }).catch(() => { });
            try {
                setRecentIds(JSON.parse(localStorage.getItem("recent_grievance_ids_v1") || "[]"));
            } catch {
                setRecentIds([]);
            }
            return;
        }
        load(true);
    }, [id, load]);

    useEffect(() => {
        if (!grievance?.grievanceId) return;
        try {
            const existing = JSON.parse(localStorage.getItem("recent_grievance_ids_v1") || "[]");
            const next = [grievance.grievanceId, ...existing.filter((x) => x !== grievance.grievanceId)].slice(0, 8);
            localStorage.setItem("recent_grievance_ids_v1", JSON.stringify(next));
        } catch {
            // ignore
        }
    }, [grievance?.grievanceId]);

    // Real-time timeline/status refresh
    useEffect(() => {
        if (!id) return undefined;
        const interval = window.setInterval(() => {
            load(false);
        }, 15000);
        return () => window.clearInterval(interval);
    }, [id, load]);

    const submitTrackById = (e) => {
        e.preventDefault();
        const cleaned = trackingId.trim();
        if (!cleaned) return toast.error("Enter a grievance ID");
        navigate(`/grievance/${cleaned}`);
    };

    const sendComment = async (e) => {
        e.preventDefault();
        if (!comment.trim()) return;
        setSubmittingComment(true);
        try {
            await api.post(`/grievances/${grievance._id}/comments`, { text: comment });
            setComment("");
            load();
        } catch (error) {
            toast.error(error?.response?.data?.message || "Failed to send comment");
        } finally {
            setSubmittingComment(false);
        }
    };

    const submitFeedback = async (e) => {
        e.preventDefault();
        setSubmittingFeedback(true);
        try {
            await api.post(`/grievances/${grievance._id}/feedback`, {
                rating,
                text: e.currentTarget.feedbackText.value,
            });
            toast.success("Feedback submitted");
            load();
        } catch (error) {
            toast.error(error?.response?.data?.message || "Failed to submit feedback");
        } finally {
            setSubmittingFeedback(false);
        }
    };

    const submitReopenRequest = async (e) => {
        e.preventDefault();
        if (!reopenReason.trim()) return toast.error("Please add a reason to reopen");
        setRequestingReopen(true);
        try {
            await api.patch(`/grievances/${grievance._id}/reopen-request`, { reason: reopenReason });
            toast.success("Reopen request submitted");
            setReopenReason("");
            load(false);
        } catch (error) {
            toast.error(error?.response?.data?.message || "Unable to submit reopen request");
        } finally {
            setRequestingReopen(false);
        }
    };

    const uploadEvidence = async (e) => {
        e.preventDefault();
        if (!evidenceFiles.length) return toast.error("Please select at least one file");
        setUploadingEvidence(true);
        try {
            const data = new FormData();
            evidenceFiles.forEach((f) => data.append("attachments", f));
            await api.post(`/grievances/${grievance._id}/attachments`, data);
            toast.success("Follow-up evidence uploaded");
            setEvidenceFiles([]);
            load(false);
        } catch (error) {
            toast.error(error?.response?.data?.message || "Unable to upload evidence");
        } finally {
            setUploadingEvidence(false);
        }
    };

    const downloadPdf = async () => {
        if (!grievance?.grievanceId) return;
        setDownloadingPdf(true);
        try {
            const res = await api.get(`/grievances/${grievance.grievanceId}/pdf`, {
                responseType: "blob",
            });
            const blob = new Blob([res.data], { type: "application/pdf" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `Grievance_${grievance.grievanceId}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch (error) {
            toast.error(error?.response?.data?.message || "Unable to download PDF");
        } finally {
            setDownloadingPdf(false);
        }
    };

    if (!id) {
        return (
            <section className="space-y-6">
                <Card className="mx-auto max-w-xl space-y-4">
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">Track Grievance</h1>
                    <p className="text-sm text-gray-600">Enter your grievance ID to open its tracking page.</p>
                    <form className="flex flex-col gap-3 sm:flex-row" onSubmit={submitTrackById}>
                        <Input
                            value={trackingId}
                            onChange={(e) => setTrackingId(e.target.value)}
                            placeholder="Example: GRV-2026-0001"
                            list="grievance-id-suggestions"
                        />
                        <datalist id="grievance-id-suggestions">
                            {[...new Set([...(recentIds || []), ...(suggestions || [])])].map((val) => (
                                <option key={val} value={val} />
                            ))}
                        </datalist>
                        <Button type="submit">Track</Button>
                    </form>
                </Card>
            </section>
        );
    }

    if (loading) return <Skeleton rows={4} />;
    if (!grievance) return <section><Card>Grievance not found</Card></section>;

    const overdue = grievance.slaDeadline
        && new Date(grievance.slaDeadline) < new Date()
        && !["Resolved", "Closed"].includes(grievance.status);

    // ✅ feedback already submitted — backend would 409, so hide the form entirely
    const feedbackAlreadySubmitted = Boolean(grievance.feedbackRating);
    const canRequestReopen = grievance.status === "Resolved" && !grievance.reopenRequested;
    const nextAction =
        grievance.status === "Pending" ? "Waiting for department admin triage" :
            grievance.status === "UnderReview" ? "Waiting for admin review/update" :
                grievance.status === "InProgress" ? "Issue is being worked on by department" :
                    grievance.status === "Resolved" ? "Waiting for your feedback/reopen decision" :
                        grievance.status === "Escalated" ? "Escalated to higher authority" :
                            "No pending action";
    const now = Date.now();
    const start = grievance.createdAt ? new Date(grievance.createdAt).getTime() : now;
    const end = grievance.slaDeadline ? new Date(grievance.slaDeadline).getTime() : now;
    const slaProgress = end > start ? Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100)) : 0;

    return (
        <section className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
                <div className="space-y-6">
                    <Card className="space-y-4">
                        <button
                            className="inline-flex w-fit items-center rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-700"
                            onClick={() => navigator.clipboard.writeText(grievance.grievanceId)}
                            type="button"
                        >
                            {grievance.grievanceId}
                        </button>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900">{grievance.title}</h1>
                        <div className="flex flex-wrap gap-2">
                            <Badge>{grievance.status}</Badge>
                            <Badge className="bg-gray-100 text-gray-700">{grievance.priority}</Badge>
                            {grievance.isAcademicUrgent && <Badge className="bg-rose-50 text-rose-700">Academic Urgent</Badge>}
                        </div>
                        <p className="text-sm text-gray-600">
                            {grievance.category?.name} · {grievance.department?.name} · {grievance.assignedTo?.name || "Unassigned"}
                        </p>
                        <p className="text-sm leading-relaxed text-gray-700">{grievance.description}</p>
                        {grievance.isAcademicUrgent && grievance.urgentReason && (
                            <p className="text-sm text-gray-600"><strong>Urgency reason:</strong> {grievance.urgentReason}</p>
                        )}
                        <p className="text-sm text-gray-600"><strong>Expected next action:</strong> {nextAction}</p>
                        <h2 className="text-lg font-semibold tracking-tight text-gray-900">Evidence Center</h2>
                        <div className="flex flex-wrap gap-2">
                            {(grievance.attachments || []).map((file) => (
                                <a
                                    className="ui-btn-outline"
                                    key={file.url}
                                    href={resolveUrl(file.url)}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    Download {file.filename} ({Math.max(1, Math.round((file.size || 0) / 1024))} KB, {file.mimetype || "file"})
                                </a>
                            ))}
                        </div>
                        <form className="grid gap-3 md:grid-cols-[1fr_auto]" onSubmit={uploadEvidence}>
                            <Input
                                type="file"
                                multiple
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={(e) => setEvidenceFiles(Array.from(e.target.files || []).slice(0, 3))}
                            />
                            <Button variant="outline" disabled={uploadingEvidence}>
                                {uploadingEvidence ? "Uploading..." : "Add Follow-up Evidence"}
                            </Button>
                        </form>
                        <Button onClick={downloadPdf} disabled={downloadingPdf}>
                            <Download size={18} /> {downloadingPdf ? "Downloading..." : "Download as PDF"}
                        </Button>
                    </Card>

                    <Card className="space-y-4">
                        <h2 className="text-lg font-semibold tracking-tight text-gray-900">Discussion</h2>
                        {(grievance.comments || []).map((item) => (
                            <div className="rounded-xl border border-gray-100 bg-gray-50 p-3" key={item._id}>
                                <strong className="text-sm text-gray-900">{item.postedBy?.name || item.role}</strong>
                                <p className="mt-1 text-sm text-gray-700">{item.text}</p>
                                <span className="mt-1 block text-xs text-gray-500">{new Date(item.timestamp).toLocaleString()}</span>
                            </div>
                        ))}
                        <form className="grid gap-3 md:grid-cols-[1fr_auto]" onSubmit={sendComment}>
                            <textarea
                                className="ui-input min-h-24"
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                placeholder="Write a comment..."
                            />
                            <Button disabled={submittingComment}>
                                <Send size={18} /> {submittingComment ? "Sending…" : "Send"}
                            </Button>
                        </form>
                    </Card>

                    {grievance.status === "Resolved" && !feedbackAlreadySubmitted && (
                        <form className="ui-card space-y-3" onSubmit={submitFeedback}>
                            <h2 className="text-lg font-semibold tracking-tight text-gray-900">Feedback</h2>
                            <label className="grid gap-2 text-sm font-medium text-gray-700">
                                Rating
                                <select className="ui-input" value={rating} onChange={(e) => setRating(Number(e.target.value))}>
                                    {[1, 2, 3, 4, 5].map((n) => <option key={n}>{n}</option>)}
                                </select>
                            </label>
                            <label className="grid gap-2 text-sm font-medium text-gray-700">
                                Comment
                                <textarea className="ui-input min-h-24" name="feedbackText" defaultValue="" />
                            </label>
                            <Button disabled={submittingFeedback}>
                                {submittingFeedback ? "Submitting…" : "Submit Feedback"}
                            </Button>
                        </form>
                    )}

                    {grievance.status === "Resolved" && feedbackAlreadySubmitted && (
                        <Card className="space-y-2">
                            <h2 className="text-lg font-semibold tracking-tight text-gray-900">Your Feedback</h2>
                            <p className="text-sm text-gray-700"><strong>Rating:</strong> {grievance.feedbackRating} / 5</p>
                            {grievance.feedbackText && <p className="text-sm text-gray-700"><strong>Comment:</strong> {grievance.feedbackText}</p>}
                        </Card>
                    )}

                    {(canRequestReopen || grievance.reopenRequested) && (
                        <Card className="space-y-3">
                            <h2 className="text-lg font-semibold tracking-tight text-gray-900">Reopen / Appeal</h2>
                            {grievance.reopenRequested ? (
                                <p className="text-sm text-gray-600">
                                    Reopen request submitted{grievance.reopenReason ? `: ${grievance.reopenReason}` : ""}.
                                </p>
                            ) : (
                                <form className="grid gap-3 md:grid-cols-[1fr_auto]" onSubmit={submitReopenRequest}>
                                    <textarea
                                        className="ui-input min-h-24"
                                        value={reopenReason}
                                        onChange={(e) => setReopenReason(e.target.value)}
                                        placeholder="Explain why this grievance should be reopened..."
                                    />
                                    <Button disabled={requestingReopen}>
                                        {requestingReopen ? "Submitting..." : "Request Reopen"}
                                    </Button>
                                </form>
                            )}
                            {grievance.reopenDecision && grievance.reopenDecision !== "pending" && (
                                <p className="text-sm text-gray-600">
                                    Decision: <strong>{grievance.reopenDecision}</strong>
                                    {grievance.reopenDecisionReason ? ` (${grievance.reopenDecisionReason})` : ""}
                                </p>
                            )}
                        </Card>
                    )}
                </div>

                <aside className="space-y-6">
                    <Card className="space-y-3">
                        <h2 className="text-lg font-semibold tracking-tight text-gray-900">Status Timeline</h2>
                        {(grievance.timeline || []).map((item) => (
                            <div className="rounded-xl border border-gray-100 bg-gray-50 p-3" key={item._id}>
                                <strong className="text-sm text-gray-900">{item.status}</strong>
                                <p className="text-sm text-gray-700">{item.message || "Status updated"}</p>
                                <span className="text-xs text-gray-500">{new Date(item.timestamp).toLocaleString()}</span>
                            </div>
                        ))}
                    </Card>
                    <Card className="space-y-3">
                        <h2 className="text-lg font-semibold tracking-tight text-gray-900">Expected Resolution</h2>
                        <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                            <div
                                className={`${overdue ? "bg-rose-600" : "bg-indigo-600"} h-full`}
                                style={{ width: `${slaProgress}%` }}
                            />
                        </div>
                        <p className={overdue ? "rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700" : "text-sm text-gray-600"}>
                            {grievance.slaDeadline
                                ? `Due by ${new Date(grievance.slaDeadline).toLocaleString()}`
                                : "No SLA set"}
                        </p>
                    </Card>
                </aside>
            </div>
        </section>
    );
}