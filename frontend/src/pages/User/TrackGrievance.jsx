// frontend/src/pages/User/TrackGrievance.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/axiosInstance";
import Timeline from "../../components/grievance/Timeline";
import { toast } from "react-toastify";
import "../../styles/UserStyles/TrackGrievance.css";

export default function TrackGrievance() {
    const { id } = useParams();          // trackingId comes here
    const navigate = useNavigate();

    const [grievance, setGrievance] = useState(null);
    const [loading, setLoading] = useState(true);
    const [commentText, setCommentText] = useState("");
    const [sendingComment, setSendingComment] = useState(false);

    // ----------------- LOAD DATA -----------------
    const fetchGrievance = async () => {
        setLoading(true);
        try {
            // This matches router.get("/track/:trackingId", ...)
            const res = await api.get(`/grievances/track/${id}`);
            const data = res.data?.grievance || res.data || null;
            setGrievance(data);
        } catch (err) {
            console.error("Track grievance error:", err);
            toast.error(err?.response?.data?.message || "Grievance not found");
            setGrievance(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGrievance();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    // ----------------- HELPERS -----------------
    const mapStatusToUi = (status) => {
        const s = (status || "").toLowerCase();
        if (s === "submitted") return "Pending";
        if (s === "in_progress") return "In Progress";
        if (s === "resolved") return "Resolved";
        if (s === "rejected") return "Rejected";
        return status || "Unknown";
    };

    // ----------------- ACTIONS -----------------
    const handleRequestClose = async () => {
        if (!grievance?._id) return;

        if (!window.confirm("Request to close this grievance?")) return;

        try {
            // matches router.patch("/update-status/:id", ...)
            await api.patch(`/grievances/update-status/${grievance._id}`, {
                status: "resolved",
                adminRemarks: "Student requested closure",
            });

            toast.success("Close request submitted");
            fetchGrievance();
        } catch (err) {
            console.error("Request close error:", err);
            toast.error("Failed to request close");
        }
    };

    const handleAddComment = async (e) => {
        e.preventDefault();
        if (!commentText.trim()) {
            toast.warn("Comment cannot be empty");
            return;
        }
        if (!grievance?._id) return;

        setSendingComment(true);
        try {
            // assuming you have POST /grievances/comment/:id in backend
            await api.post(`/grievances/comment/${grievance._id}`, {
                comment: commentText,
            });

            toast.success("Comment added");
            setCommentText("");
            fetchGrievance();
        } catch (err) {
            console.error("Add comment error:", err);
            toast.error("Failed to add comment");
        } finally {
            setSendingComment(false);
        }
    };

    // ----------------- UI STATES -----------------
    if (loading) {
        return (
            <div className="tg-center-state">
                <p>Loading grievance...</p>
            </div>
        );
    }

    if (!grievance) {
        return (
            <div className="tg-center-state">
                <p>No grievance found.</p>
                <button
                    className="tg-btn"
                    onClick={() => navigate("/user/my-grievances")}
                >
                    Back to My Grievances
                </button>
            </div>
        );
    }

    // ----------------- DATA -----------------
    const {
        title,
        description,
        trackingId,
        status,
        priority,
        attachments = [],
        timeline = [],
        comments = [],
        createdAt,
        updatedAt,
        userEmail,
        assignedTo,
        adminRemarks,
    } = grievance;

    const uiStatus = mapStatusToUi(status);

    return (
        <div className="tg-page">
            {/* HEADER CARD */}
            <div className="tg-header-card">
                <div className="tg-header-main">
                    <h1 className="tg-title">{title}</h1>

                    <div className="tg-badges-row">
                        <span className="tg-badge status">{uiStatus}</span>
                        <span className="tg-badge">
                            Priority: {priority || "Medium"}
                        </span>
                        <span className="tg-badge">
                            Tracking: {trackingId || "N/A"}
                        </span>
                    </div>

                    <p className="tg-description">{description}</p>

                    <div className="tg-header-actions">
                        <button
                            className="tg-btn ghost"
                            onClick={() => navigate("/user/my-grievances")}
                        >
                            ← Back
                        </button>

                        <button
                            className="tg-btn outline"
                            onClick={handleRequestClose}
                        >
                            Request Close
                        </button>
                    </div>
                </div>

                {/* RIGHT INFO PANEL */}
                <aside className="tg-side-panel">
                    <div className="tg-side-card">
                        <h4>Submitted By</h4>
                        <p>{userEmail || "Anonymous"}</p>
                        <p className="tg-muted">
                            Submitted:{" "}
                            {createdAt
                                ? new Date(createdAt).toLocaleString()
                                : "-"}
                        </p>
                    </div>

                    <div className="tg-side-card">
                        <h4>Assigned Admin</h4>
                        {assignedTo ? (
                            <>
                                <p>{assignedTo.name || "Admin"}</p>
                                <p className="tg-muted">{assignedTo.email}</p>
                            </>
                        ) : (
                            <p className="tg-muted">Not assigned yet</p>
                        )}
                    </div>

                    <div className="tg-side-card">
                        <h4>Attachments</h4>
                        {attachments.length ? (
                            <ul className="tg-attachments">
                                {attachments.map((a, idx) => {
                                    const url =
                                        a.fileUrl || a.url || a.path || a;
                                    const label =
                                        a.fileName ||
                                        a.name ||
                                        `Attachment ${idx + 1}`;
                                    return (
                                        <li key={idx}>
                                            <a
                                                href={url}
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                {label}
                                            </a>
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : (
                            <p className="tg-muted">No attachments</p>
                        )}
                    </div>

                    <div className="tg-side-card">
                        <h4>Admin Remarks</h4>
                        <p>{adminRemarks || "—"}</p>
                        <p className="tg-muted">
                            Last updated:{" "}
                            {updatedAt
                                ? new Date(updatedAt).toLocaleString()
                                : "-"}
                        </p>
                    </div>
                </aside>
            </div>

            {/* TIMELINE + COMMENTS */}
            <div className="tg-main-grid">
                {/* Timeline */}
                <div className="tg-block">
                    <h3 className="tg-block-title">Timeline</h3>
                    <Timeline events={timeline} />
                </div>

                {/* Comments */}
                <div className="tg-block">
                    <h3 className="tg-block-title">Comments</h3>

                    <div className="tg-comments-list">
                        {comments.length === 0 ? (
                            <p className="tg-muted">No comments yet</p>
                        ) : (
                            comments.map((c) => (
                                <div className="tg-comment" key={c._id}>
                                    <div className="tg-comment-head">
                                        <strong>
                                            {c.authorName ||
                                                (c.isAdmin ? "Admin" : "User")}
                                        </strong>
                                        <span className="tg-muted">
                                            {new Date(
                                                c.createdAt
                                            ).toLocaleString()}
                                        </span>
                                    </div>
                                    <p>{c.text}</p>
                                </div>
                            ))
                        )}
                    </div>

                    <form
                        onSubmit={handleAddComment}
                        className="tg-comment-form"
                    >
                        <textarea
                            value={commentText}
                            onChange={(e) =>
                                setCommentText(e.target.value)
                            }
                            placeholder="Write a comment..."
                        />
                        <button
                            type="submit"
                            disabled={sendingComment}
                            className="tg-btn"
                        >
                            {sendingComment ? "Sending..." : "Send"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
