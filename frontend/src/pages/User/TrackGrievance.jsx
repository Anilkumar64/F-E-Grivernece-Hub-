import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Download, Send } from "lucide-react";
import api from "../../api/axiosInstance";
import Skeleton from "../../components/common/Skeleton";

const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:4400";

export default function TrackGrievance() {
    const { id } = useParams();
    const [grievance, setGrievance] = useState(null);
    const [loading, setLoading] = useState(true);
    const [comment, setComment] = useState("");
    const [rating, setRating] = useState(5);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get(`/grievances/${id}`);
            setGrievance(res.data.grievance);
        } catch (error) {
            toast.error(error?.response?.data?.message || "Unable to load grievance");
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { load(); }, [load]);

    const sendComment = async (e) => {
        e.preventDefault();
        if (!comment.trim()) return;
        await api.post(`/grievances/${grievance._id}/comments`, { text: comment });
        setComment("");
        load();
    };

    const submitFeedback = async (e) => {
        e.preventDefault();
        await api.post(`/grievances/${grievance._id}/feedback`, { rating, text: e.currentTarget.feedbackText.value });
        toast.success("Feedback submitted");
        load();
    };

    if (loading) return <Skeleton rows={4} />;
    if (!grievance) return <section className="page-section"><div className="card">Grievance not found</div></section>;

    const overdue = grievance.slaDeadline && new Date(grievance.slaDeadline) < new Date() && !["Resolved", "Closed"].includes(grievance.status);

    return (
        <section className="page-section">
            <div className="detail-layout">
                <div className="page-section">
                    <div className="card">
                        <button className="id-badge" onClick={() => navigator.clipboard.writeText(grievance.grievanceId)}>{grievance.grievanceId}</button>
                        <h1>{grievance.title}</h1>
                        <div><span className={`status-badge ${grievance.status}`}>{grievance.status}</span><span className={`priority-badge ${grievance.priority}`}>{grievance.priority}</span></div>
                        <p className="muted">{grievance.category?.name} · {grievance.department?.name} · {grievance.assignedTo?.name || "Unassigned"}</p>
                        <p>{grievance.description}</p>
                        <div className="file-list">
                            {(grievance.attachments || []).map((file) => <a className="secondary-btn" key={file.url} href={`${baseUrl}${file.url}`} target="_blank" rel="noreferrer">Download {file.filename}</a>)}
                        </div>
                        <a className="primary-btn" href={`${baseUrl}/api/grievances/${grievance.grievanceId}/pdf`} target="_blank" rel="noreferrer"><Download size={18} /> Download as PDF</a>
                    </div>

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
                            <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Write a comment..." />
                            <button className="primary-btn"><Send size={18} /> Send</button>
                        </form>
                    </div>

                    {grievance.status === "Resolved" && (
                        <form className="card" onSubmit={submitFeedback}>
                            <h2>Feedback</h2>
                            <label>Rating<select value={rating} onChange={(e) => setRating(Number(e.target.value))}>{[1, 2, 3, 4, 5].map((n) => <option key={n}>{n}</option>)}</select></label>
                            <label>Comment<textarea name="feedbackText" defaultValue={grievance.feedbackText || ""} /></label>
                            <button className="primary-btn">Submit Feedback</button>
                        </form>
                    )}
                </div>

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
                        <p className={overdue ? "pill danger" : "muted"}>{grievance.slaDeadline ? `Due by ${new Date(grievance.slaDeadline).toLocaleString()}` : "No SLA set"}</p>
                    </div>
                </aside>
            </div>
        </section>
    );
}
