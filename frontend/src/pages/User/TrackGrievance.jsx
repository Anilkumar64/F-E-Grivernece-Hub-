import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../../api/axiosInstance";
import Skeleton from "../../components/common/Skeleton";

export default function TrackGrievance() {
    const { id } = useParams();
    const [grievance, setGrievance] = useState(null);
    const [loading, setLoading] = useState(true);
    const [comment, setComment] = useState("");
    const [rating, setRating] = useState(5);

    const load = () => api.get(`/grievances/${id}`).then((res) => setGrievance(res.data.grievance)).finally(() => setLoading(false));

    useEffect(() => { load(); }, [id]);

    const addComment = async (e) => {
        e.preventDefault();
        if (!comment.trim()) return;
        await api.post(`/grievances/${grievance._id}/comments`, { text: comment });
        setComment("");
        toast.success("Comment added");
        load();
    };

    const submitFeedback = async (e) => {
        e.preventDefault();
        await api.post(`/grievances/${grievance._id}/feedback`, { rating, text: e.currentTarget.feedbackText.value });
        toast.success("Feedback submitted");
        load();
    };

    if (loading) return <Skeleton rows={4} />;
    if (!grievance) return <section className="page-section">Grievance not found</section>;

    return (
        <section className="detail-layout">
            <div className="detail-main">
                <div className="detail-header">
                    <span className="id-badge">{grievance.grievanceId}</span>
                    <h1>{grievance.title}</h1>
                    <div><span className={`status-badge ${grievance.status}`}>{grievance.status}</span><span className="priority-badge">{grievance.priority}</span></div>
                    <p>Submitted {new Date(grievance.createdAt).toLocaleString()}</p>
                </div>
                <div className="info-panel">
                    <h2>Description</h2><p>{grievance.description}</p>
                    <p><strong>Category:</strong> {grievance.category?.name}</p>
                    <p><strong>Department:</strong> {grievance.department?.name}</p>
                    <p><strong>Assigned Admin:</strong> {grievance.assignedTo?.name || "Not assigned"}</p>
                    <h2>Attachments</h2>
                    {grievance.attachments?.length ? grievance.attachments.map((file) => <a key={file.url} href={file.url} target="_blank" rel="noreferrer">{file.filename}</a>) : <p>No attachments</p>}
                </div>
                <div className="comments">
                    <h2>Comments</h2>
                    {grievance.comments?.map((item) => <div className={`comment ${item.role}`} key={item._id}><strong>{item.postedBy?.name || item.role}</strong><p>{item.text}</p></div>)}
                    <form onSubmit={addComment} className="inline-form"><textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Write a comment" /><button className="primary-btn">Send</button></form>
                </div>
                {grievance.status === "Resolved" && !grievance.feedbackRating && (
                    <form className="feedback-form" onSubmit={submitFeedback}>
                        <h2>Feedback</h2>
                        <input type="number" min="1" max="5" value={rating} onChange={(e) => setRating(e.target.value)} />
                        <textarea name="feedbackText" placeholder="Optional comment" />
                        <button className="primary-btn">Submit Feedback</button>
                    </form>
                )}
            </div>
            <aside className="timeline-panel">
                <h2>Timeline</h2>
                {grievance.timeline?.map((event) => <div className="timeline-item" key={event._id}><strong>{event.status}</strong><p>{event.message}</p><span>{new Date(event.timestamp).toLocaleString()}</span></div>)}
            </aside>
        </section>
    );
}
