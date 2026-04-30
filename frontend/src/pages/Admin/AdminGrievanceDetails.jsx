import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../../api/axiosInstance";
import Skeleton from "../../components/common/Skeleton";

export default function AdminGrievanceDetails() {
    const { id } = useParams();
    const [grievance, setGrievance] = useState(null);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState("");
    const [message, setMessage] = useState("");
    const [comment, setComment] = useState("");

    const load = async () => {
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
    };

    useEffect(() => { load(); }, [id]);

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

    if (loading) return <Skeleton rows={4} />;
    if (!grievance) return <section className="page-section"><div className="card">Grievance not found</div></section>;

    return (
        <section className="page-section">
            <div className="detail-layout">
                <div className="page-section">
                    <div className="card">
                        <button className="id-badge">{grievance.grievanceId}</button>
                        <h1>{grievance.title}</h1>
                        <div><span className={`status-badge ${grievance.status}`}>{grievance.status}</span><span className={`priority-badge ${grievance.priority}`}>{grievance.priority}</span></div>
                        <p className="muted">Student: {grievance.submittedBy?.name} · {grievance.submittedBy?.email}</p>
                        <p>{grievance.description}</p>
                    </div>
                    <form className="card" onSubmit={updateStatus}>
                        <h2>Update Status</h2>
                        <div className="form-grid">
                            <label>Status<select value={status} onChange={(e) => setStatus(e.target.value)}>{["Pending", "UnderReview", "InProgress", "Resolved", "Escalated", "Closed"].map((item) => <option key={item}>{item}</option>)}</select></label>
                            <label>Assigned Admin<input value={grievance.assignedTo?.name || "Current department queue"} readOnly /></label>
                        </div>
                        <label>Required Comment<textarea value={message} onChange={(e) => setMessage(e.target.value)} /></label>
                        <button className="primary-btn">Update Status</button>
                    </form>
                    <div className="card">
                        <h2>Discussion</h2>
                        {(grievance.comments || []).map((item) => <div className={`comment ${item.role}`} key={item._id}><strong>{item.postedBy?.name || item.role}</strong><p>{item.text}</p><span className="muted">{new Date(item.timestamp).toLocaleString()}</span></div>)}
                        <form className="inline-form" onSubmit={reply}><textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Reply to student..." /><button className="primary-btn">Reply</button></form>
                    </div>
                </div>
                <aside className="timeline-panel">
                    <div className="card">
                        <h2>Audit Timeline</h2>
                        {(grievance.timeline || []).map((item) => <div className="timeline-item" key={item._id}><strong>{item.status}</strong><p>{item.message || "Status updated"}</p><span className="muted">{new Date(item.timestamp).toLocaleString()}</span></div>)}
                    </div>
                </aside>
            </div>
        </section>
    );
}
