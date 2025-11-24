import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/axiosInstance";
import Timeline from "../../components/grievance/Timeline";
import { toast } from "react-toastify";
// import "../styles/GrievanceDetails.css";

export default function GrievanceDetails() {
    const { id } = useParams(); // can be _id or trackingId
    const navigate = useNavigate();

    const [grievance, setGrievance] = useState(null);
    const [loading, setLoading] = useState(true);
    const [commentText, setCommentText] = useState("");
    const [sendingComment, setSendingComment] = useState(false);

    useEffect(() => {
        fetchGrievance();
        // eslint-disable-next-line
    }, [id]);

    const fetchGrievance = async () => {
        setLoading(true);
        try {
            // First try by _id
            const res = await api.get(`/grievances/${id}`);
            const data = res.data?.grievance || res.data || {};
            setGrievance(data);
        } catch (err) {
            console.error("Fetch grievance error:", err);
            toast.error("Failed via ID, trying tracking ID...");

            // Optional fallback by trackingId
            try {
                const res2 = await api.get(`/grievances/track/${id}`);
                const data2 = res2.data?.grievance || res2.data || {};
                setGrievance(data2);
            } catch (err2) {
                console.error("fallback track fetch failed:", err2);
                toast.error(
                    err2?.response?.data?.message || "Could not find this grievance"
                );
            }
        } finally {
            setLoading(false);
        }
    };

    const handleAddComment = async (e) => {
        e.preventDefault();
        if (!commentText.trim()) {
            return toast.warn("Write a comment first.");
        }

        if (!grievance?._id && !grievance?.trackingId) {
            toast.error("Invalid grievance reference");
            return;
        }

        setSendingComment(true);
        try {
            const targetId = grievance._id || grievance.trackingId;
            await api.post(`/grievances/comment/${targetId}`, {
                comment: commentText,
            });

            toast.success("Comment added");
            setCommentText("");
            await fetchGrievance();
        } catch (err) {
            console.error("Add comment error:", err);
            toast.error(err?.response?.data?.message || "Failed to add comment");
        } finally {
            setSendingComment(false);
        }
    };

    const handleRequestClose = async () => {
        if (!window.confirm("Request to close this grievance?")) return;

        if (!grievance?._id) {
            toast.error("Invalid grievance");
            return;
        }

        try {
            await api.patch(`/grievances/update-status/${grievance._id}`, {
                status: "Resolved",
                message: "Student requested closure",
            });
            toast.success("Close request submitted");
            fetchGrievance();
        } catch (err) {
            console.error("Request close error:", err);
            toast.error(err?.response?.data?.message || "Failed to request close");
        }
    };

    if (loading) return <div className="gd-loading">Loading grievance...</div>;
    if (!grievance) return <div className="gd-empty">No grievance found.</div>;

    const {
        title,
        description,
        trackingId,
        status,
        priority,
        attachments = [],
        timeline = [],
        adminAssigned,
        adminRemarks,
        createdAt,
        updatedAt,
        userEmail,
    } = grievance;

    const safeTimeline = Array.isArray(timeline) ? timeline : [];
    const comments = Array.isArray(grievance.comments) ? grievance.comments : [];

    return (
        <div className="grievance-details-page">
            <div className="gd-header">
                <div className="gd-left">
                    <h1>{title}</h1>

                    <div className="gd-meta">
                        <span
                            className={`gd-badge ${status
                                ?.toLowerCase()
                                .replace(" ", "-")}`}
                        >
                            {status}
                        </span>
                        <span className="gd-priority">
                            Priority: {priority || "Medium"}
                        </span>
                        <span className="gd-tracking">
                            Tracking: {trackingId || "N/A"}
                        </span>
                    </div>

                    <p className="gd-desc">{description}</p>

                    <div className="gd-actions">
                        <button
                            onClick={() => navigate("/user/my-grievances")}
                            className="gd-btn"
                        >
                            Back
                        </button>
                        <button
                            onClick={handleRequestClose}
                            className="gd-btn outline"
                        >
                            Request Close
                        </button>
                    </div>
                </div>

                <aside className="gd-right">
                    <div className="gd-card">
                        <h4>Submitted By</h4>
                        <p>{userEmail || "Anonymous"}</p>
                        <p className="muted">
                            Submitted:{" "}
                            {createdAt
                                ? new Date(createdAt).toLocaleString()
                                : "N/A"}
                        </p>
                    </div>

                    <div className="gd-card">
                        <h4>Assigned Admin</h4>
                        {adminAssigned ? (
                            <>
                                <p>
                                    {adminAssigned.name ||
                                        adminAssigned.username ||
                                        "Admin"}
                                </p>
                                {adminAssigned.email && (
                                    <p className="muted">
                                        {adminAssigned.email}
                                    </p>
                                )}
                                <p className="muted">
                                    Dept:{" "}
                                    {adminAssigned.department || "—"}
                                </p>
                            </>
                        ) : (
                            <p className="muted">Not assigned yet</p>
                        )}
                    </div>

                    <div className="gd-card">
                        <h4>Attachments</h4>
                        {attachments.length ? (
                            <ul className="gd-attach-list">
                                {attachments.map((a, idx) => {
                                    const url =
                                        typeof a === "string"
                                            ? a.startsWith("http")
                                                ? a
                                                : `/uploads/${a}`
                                            : a.url || "#";
                                    return (
                                        <li key={idx}>
                                            <a
                                                href={url}
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                Attachment {idx + 1}
                                            </a>
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : (
                            <p className="muted">No attachments</p>
                        )}
                    </div>

                    <div className="gd-card">
                        <h4>Admin Remarks</h4>
                        <p>{adminRemarks || "—"}</p>
                        <p className="muted">
                            Last updated:{" "}
                            {updatedAt
                                ? new Date(updatedAt).toLocaleString()
                                : "N/A"}
                        </p>
                    </div>
                </aside>
            </div>

            <div className="gd-main">
                <div className="gd-timeline-col">
                    <h3>Timeline</h3>
                    <Timeline events={safeTimeline} />
                </div>

                <div className="gd-comments-col">
                    <h3>Comments</h3>

                    <div className="gd-comments-list">
                        {comments.length === 0 && (
                            <p className="muted">
                                No comments yet — be first to reply.
                            </p>
                        )}

                        {comments.map((c) => (
                            <div
                                className="gd-comment"
                                key={c._id || c.createdAt}
                            >
                                <div className="gd-comment-head">
                                    <strong>
                                        {c.authorName ||
                                            c.author ||
                                            (c.isAdmin ? "Admin" : "You")}
                                    </strong>
                                    <span className="muted">
                                        {c.createdAt
                                            ? new Date(
                                                c.createdAt
                                            ).toLocaleString()
                                            : ""}
                                    </span>
                                </div>
                                <div className="gd-comment-body">
                                    {c.text || c.comment}
                                </div>
                            </div>
                        ))}
                    </div>

                    <form
                        onSubmit={handleAddComment}
                        className="gd-comment-form"
                    >
                        <textarea
                            placeholder="Write a comment or reply..."
                            value={commentText}
                            onChange={(e) =>
                                setCommentText(e.target.value)
                            }
                            rows={4}
                        />
                        <div className="gd-comment-actions">
                            <button
                                type="submit"
                                disabled={sendingComment}
                                className="gd-btn"
                            >
                                {sendingComment ? "Sending..." : "Send"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
