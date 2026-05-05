import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Download, Send } from "lucide-react";
import api from "../../api/axiosInstance";
import Skeleton from "../../components/common/Skeleton";

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
            <section className="page-section">
                <div className="card" style={{ maxWidth: 560 }}>
                    <h1>Track Grievance</h1>
                    <p className="muted">Enter your grievance ID to open its tracking page.</p>
                    <form className="inline-form" onSubmit={submitTrackById}>
                        <input
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
                        <button className="primary-btn" type="submit">Track</button>
                    </form>
                </div>
            </section>
        );
    }

    if (loading) return <Skeleton rows={4} />;
    if (!grievance) return (
        <section className="page-section">
            <div className="card">Grievance not found</div>
        </section>
    );

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
        <section className="page-section">
            <div className="detail-layout">
                <div className="page-section">
                    {/* ── Grievance details ── */}
                    <div className="card">
                        <button
                            className="id-badge"
                            onClick={() => navigator.clipboard.writeText(grievance.grievanceId)}
                        >
                            {grievance.grievanceId}
                        </button>
                        <h1>{grievance.title}</h1>
                        <div>
                            <span className={`status-badge ${grievance.status}`}>{grievance.status}</span>
                            <span className={`priority-badge ${grievance.priority}`}>{grievance.priority}</span>
                            {grievance.isAcademicUrgent && <span className="pill danger">Academic Urgent</span>}
                        </div>
                        <p className="muted">
                            {grievance.category?.name} · {grievance.department?.name} · {grievance.assignedTo?.name || "Unassigned"}
                        </p>
                        <p>{grievance.description}</p>
                        {grievance.isAcademicUrgent && grievance.urgentReason && (
                            <p className="muted"><strong>Urgency reason:</strong> {grievance.urgentReason}</p>
                        )}
                        <p className="muted"><strong>Expected next action:</strong> {nextAction}</p>
                        <h2>Evidence Center</h2>
                        <div className="file-list">
                            {(grievance.attachments || []).map((file) => (
                                <a
                                    className="secondary-btn"
                                    key={file.url}
                                    href={resolveUrl(file.url)}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    Download {file.filename} ({Math.max(1, Math.round((file.size || 0) / 1024))} KB, {file.mimetype || "file"})
                                </a>
                            ))}
                        </div>
                        <form className="inline-form" onSubmit={uploadEvidence}>
                            <input
                                type="file"
                                multiple
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={(e) => setEvidenceFiles(Array.from(e.target.files || []).slice(0, 3))}
                            />
                            <button className="secondary-btn" disabled={uploadingEvidence}>
                                {uploadingEvidence ? "Uploading..." : "Add Follow-up Evidence"}
                            </button>
                        </form>
                        <button className="primary-btn" onClick={downloadPdf} disabled={downloadingPdf}>
                            <Download size={18} /> {downloadingPdf ? "Downloading..." : "Download as PDF"}
                        </button>
                    </div>

                    {/* ── Discussion ── */}
                    <div className="card">
                        <h2>Discussion</h2>
                        {(grievance.comments || []).map((item) => (
                            <div className={`comment ${item.role}`} key={item._id}>
                                <strong>{item.postedBy?.name || item.role}</strong>
                                <p>{item.text}</p>
                                <span className="muted">{new Date(item.timestamp).toLocaleString()}</span>
                            </div>
                        ))}
                        <form className="inline-form" onSubmit={sendComment}>
                            <textarea
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                placeholder="Write a comment..."
                            />
                            <button className="primary-btn" disabled={submittingComment}>
                                <Send size={18} /> {submittingComment ? "Sending…" : "Send"}
                            </button>
                        </form>
                    </div>

                    {/* ── Feedback — only show if resolved AND not yet submitted ── */}
                    {grievance.status === "Resolved" && !feedbackAlreadySubmitted && (  /* ✅ was missing !feedbackAlreadySubmitted */
                        <form className="card" onSubmit={submitFeedback}>
                            <h2>Feedback</h2>
                            <label>
                                Rating
                                <select value={rating} onChange={(e) => setRating(Number(e.target.value))}>
                                    {[1, 2, 3, 4, 5].map((n) => <option key={n}>{n}</option>)}
                                </select>
                            </label>
                            <label>
                                Comment
                                <textarea name="feedbackText" defaultValue="" />
                            </label>
                            <button className="primary-btn" disabled={submittingFeedback}>
                                {submittingFeedback ? "Submitting…" : "Submit Feedback"}
                            </button>
                        </form>
                    )}

                    {/* ── Show submitted feedback read-only ── */}
                    {grievance.status === "Resolved" && feedbackAlreadySubmitted && (
                        <div className="card">
                            <h2>Your Feedback</h2>
                            <p><strong>Rating:</strong> {grievance.feedbackRating} / 5</p>
                            {grievance.feedbackText && <p><strong>Comment:</strong> {grievance.feedbackText}</p>}
                        </div>
                    )}

                    {(canRequestReopen || grievance.reopenRequested) && (
                        <div className="card">
                            <h2>Reopen / Appeal</h2>
                            {grievance.reopenRequested ? (
                                <p className="muted">
                                    Reopen request submitted{grievance.reopenReason ? `: ${grievance.reopenReason}` : ""}.
                                </p>
                            ) : (
                                <form className="inline-form" onSubmit={submitReopenRequest}>
                                    <textarea
                                        value={reopenReason}
                                        onChange={(e) => setReopenReason(e.target.value)}
                                        placeholder="Explain why this grievance should be reopened..."
                                    />
                                    <button className="primary-btn" disabled={requestingReopen}>
                                        {requestingReopen ? "Submitting..." : "Request Reopen"}
                                    </button>
                                </form>
                            )}
                            {grievance.reopenDecision && grievance.reopenDecision !== "pending" && (
                                <p className="muted">
                                    Decision: <strong>{grievance.reopenDecision}</strong>
                                    {grievance.reopenDecisionReason ? ` (${grievance.reopenDecisionReason})` : ""}
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Timeline sidebar ── */}
                <aside className="timeline-panel">
                    <div className="card">
                        <h2>Status Timeline</h2>
                        {(grievance.timeline || []).map((item) => (
                            <div className="timeline-item" key={item._id}>
                                <strong>{item.status}</strong>
                                <p>{item.message || "Status updated"}</p>
                                <span className="muted">{new Date(item.timestamp).toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                    <div className="card">
                        <h2>Expected Resolution</h2>
                        <div style={{ height: 8, borderRadius: 8, background: "#e5e7eb", overflow: "hidden", marginBottom: 8 }}>
                            <div style={{ width: `${slaProgress}%`, height: "100%", background: overdue ? "#dc2626" : "#2563eb" }} />
                        </div>
                        <p className={overdue ? "pill danger" : "muted"}>
                            {grievance.slaDeadline
                                ? `Due by ${new Date(grievance.slaDeadline).toLocaleString()}`
                                : "No SLA set"}
                        </p>
                    </div>
                </aside>
            </div>
        </section>
    );
}