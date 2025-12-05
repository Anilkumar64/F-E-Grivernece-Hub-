import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/axiosInstance";
import { toast } from "react-toastify";

export default function GrievanceDetails() {
    const { id } = useParams(); // ALWAYS trackingId (your backend logic)
    const navigate = useNavigate();

    const [grievance, setGrievance] = useState(null);
    const [loading, setLoading] = useState(true);

    const [commentText, setCommentText] = useState("");
    const [sendingComment, setSendingComment] = useState(false);

    // ================================
    // FETCH GRIEVANCE (trackingId only)
    // ================================
    const fetchGrievance = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/grievances/${id}`);
            setGrievance(res.data?.grievance || res.data || null);
        } catch (err) {
            console.error("Fetch grievance error:", err);
            toast.error("Could not load grievance");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGrievance();
    }, [id]);

    // ================================
    // ADD COMMENT
    // ================================
    const handleAddComment = async (e) => {
        e.preventDefault();
        if (!commentText.trim()) return toast.warn("Comment cannot be empty");

        if (!grievance?._id)
            return toast.error("Invalid grievance reference");

        setSendingComment(true);
        try {
            await api.post(`/grievances/comment/${grievance._id}`, {
                comment: commentText,
            });

            toast.success("Comment added");
            setCommentText("");
            fetchGrievance();
        } catch (err) {
            console.error("Comment error:", err);
            toast.error("Failed to add comment");
        } finally {
            setSendingComment(false);
        }
    };

    // ================================
    // REQUEST CLOSE
    // ================================
    const handleRequestClose = async () => {
        if (!window.confirm("Request to close this grievance?")) return;

        try {
            await api.patch(`/grievances/update-status/${grievance._id}`, {
                status: "Resolved",
                message: "Student requested closing",
            });

            toast.success("Close request submitted");
            fetchGrievance();
        } catch (err) {
            console.error("Close request error:", err);
            toast.error("Failed to request close");
        }
    };

    // ================================
    // RENDER START
    // ================================
    if (loading) return <div className="gd-loading">Loading…</div>;
    if (!grievance) return <div className="gd-empty">Grievance not found</div>;

    const {
        title,
        description,
        trackingId,
        status,
        priority,
        attachments = [],
        comments = [],
        history = [],
        adminAssigned,
        createdAt,
        updatedAt,
    } = grievance;

    return (
        <div className="gd-page">

            {/* HEADER */}
            <div className="gd-header">
                <h1>{title}</h1>

                <div className="gd-status-row">
                    <span className={`gd-badge ${status?.toLowerCase()}`}>
                        {status}
                    </span>
                    <span className="gd-priority">
                        Priority: {priority}
                    </span>
                    <span className="gd-tracking">
                        Tracking: {trackingId}
                    </span>
                </div>

                <p className="gd-desc">{description}</p>

                <button className="gd-btn" onClick={() => navigate("/user/my-grievances")}>
                    ← Back
                </button>

                <button className="gd-btn outline" onClick={handleRequestClose}>
                    Request Close
                </button>
            </div>

            {/* RIGHT SIDEBAR */}
            <aside className="gd-side">
                <div className="gd-card">
                    <h3>Submitted</h3>
                    <p>{new Date(createdAt).toLocaleString()}</p>
                </div>

                <div className="gd-card">
                    <h3>Assigned Admin</h3>
                    {adminAssigned ? (
                        <>
                            <p>{adminAssigned.name}</p>
                            <p className="muted">{adminAssigned.email}</p>
                            <p className="muted">Dept: {adminAssigned.department?.name || "—"}</p>
                        </>
                    ) : (
                        <p className="muted">Not assigned yet</p>
                    )}
                </div>

                <div className="gd-card">
                    <h3>Attachments</h3>
                    {attachments.length ? (
                        attachments.map((file, idx) => (
                            <a
                                key={idx}
                                href={file.url || file}
                                target="_blank"
                                rel="noreferrer"
                            >
                                Attachment {idx + 1}
                            </a>
                        ))
                    ) : (
                        <p className="muted">No Attachments</p>
                    )}
                </div>
            </aside>

            {/* TIMELINE + COMMENTS */}
            <div className="gd-content">

                {/* TIMELINE */}
                <div className="gd-block">
                    <h2>Timeline</h2>
                    {history.length === 0 ? (
                        <p className="muted">No timeline updates yet</p>
                    ) : (
                        <ul className="gd-timeline">
                            {history.map((h, i) => (
                                <li key={i}>
                                    <strong>{h.action}</strong>
                                    <p>{h.message}</p>
                                    <span className="muted">
                                        {new Date(h.time).toLocaleString()}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* COMMENTS */}
                <div className="gd-block">
                    <h2>Comments</h2>

                    <div className="gd-comment-list">
                        {comments.length === 0 ? (
                            <p className="muted">No comments yet</p>
                        ) : (
                            comments.map((c) => (
                                <div className="gd-comment" key={c._id}>
                                    <strong>{c.authorName || "User"}</strong>
                                    <p>{c.text}</p>
                                    <span className="muted">
                                        {new Date(c.createdAt).toLocaleString()}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>

                    <form onSubmit={handleAddComment} className="gd-comment-form">
                        <textarea
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            placeholder="Write your comment..."
                        />
                        <button className="gd-btn" disabled={sendingComment}>
                            {sendingComment ? "Sending..." : "Send"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
