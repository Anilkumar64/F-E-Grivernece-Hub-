import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/axiosInstance";
import Timeline from "../../components/grievance/Timeline";
import { toast } from "react-toastify";

export default function TrackGrievance() {
    const { id } = useParams(); // id may be _id or trackingId depending on route
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
            // First try: /grievances/:id
            const res = await api.get(`/grievances/${id}`);
            const data = res.data?.grievance || res.data || {};
            setGrievance(data);
        } catch (err) {
            console.error("Fetch grievance error:", err);
            toast.error(
                err?.response?.data?.message || "Failed to load grievance, trying alternate..."
            );

            // Optional fallback: /grievances/track/:trackingId
            try {
                const res2 = await api.get(`/grievances/track/${id}`);
                const data2 = res2.data?.grievance || res2.data || {};
                setGrievance(data2);
            } catch (err2) {
                console.error("Fallback track fetch failed:", err2);
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
        if (!commentText.trim()) return toast.warn("Write a comment first.");

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

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <p className="text-gray-500">Loading grievance...</p>
            </div>
        );
    }

    if (!grievance) {
        return (
            <div className="flex justify-center items-center h-64">
                <p className="text-gray-500">No grievance found.</p>
            </div>
        );
    }

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
    const comments = Array.isArray(grievance.comments)
        ? grievance.comments
        : [];

    return (
        <div className="max-w-6xl mx-auto p-4 space-y-6">
            {/* Header + meta */}
            <div className="bg-white shadow rounded-xl p-6 flex flex-col md:flex-row gap-6">
                <div className="flex-1">
                    <h1 className="text-2xl font-semibold mb-2">{title}</h1>

                    <div className="flex flex-wrap gap-2 mb-3 text-sm">
                        <span
                            className={`px-2 py-1 rounded-full text-xs font-semibold ${status === "Resolved"
                                ? "bg-green-100 text-green-700"
                                : status === "Pending"
                                    ? "bg-yellow-100 text-yellow-700"
                                    : "bg-blue-100 text-blue-700"
                                }`}
                        >
                            {status || "Status Unknown"}
                        </span>
                        <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                            Priority: {priority || "Medium"}
                        </span>
                        <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                            Tracking: {trackingId || "N/A"}
                        </span>
                    </div>

                    <p className="text-gray-700 mb-4 whitespace-pre-line">
                        {description}
                    </p>

                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={() => navigate("/user/my-grievances")}
                            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 text-sm"
                        >
                            Back to My Grievances
                        </button>
                        <button
                            onClick={handleRequestClose}
                            className="px-4 py-2 rounded-lg border border-blue-500 text-blue-600 hover:bg-blue-50 text-sm"
                        >
                            Request Close
                        </button>
                    </div>
                </div>

                {/* Right side info cards */}
                <aside className="w-full md:w-72 space-y-3">
                    <div className="bg-gray-50 rounded-lg p-3">
                        <h4 className="font-semibold text-sm mb-1">Submitted By</h4>
                        <p className="text-sm">
                            {userEmail || "Anonymous"}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                            Submitted:{" "}
                            {createdAt
                                ? new Date(createdAt).toLocaleString()
                                : "N/A"}
                        </p>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-3">
                        <h4 className="font-semibold text-sm mb-1">Assigned Admin</h4>
                        {adminAssigned ? (
                            <>
                                <p className="text-sm">
                                    {adminAssigned.name ||
                                        adminAssigned.username ||
                                        "Admin"}
                                </p>
                                {adminAssigned.email && (
                                    <p className="text-xs text-gray-600">
                                        {adminAssigned.email}
                                    </p>
                                )}
                                {adminAssigned.department && (
                                    <p className="text-xs text-gray-500">
                                        Dept: {adminAssigned.department}
                                    </p>
                                )}
                            </>
                        ) : (
                            <p className="text-xs text-gray-500">
                                Not assigned yet
                            </p>
                        )}
                    </div>

                    <div className="bg-gray-50 rounded-lg p-3">
                        <h4 className="font-semibold text-sm mb-1">Attachments</h4>
                        {attachments.length ? (
                            <ul className="space-y-1 text-sm">
                                {attachments.map((a, idx) => {
                                    const url = typeof a === "string"
                                        ? (a.startsWith("http") ? a : `/uploads/${a}`)
                                        : a.url || "#";

                                    return (
                                        <li key={idx}>
                                            <a
                                                href={url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-blue-600 hover:underline text-xs"
                                            >
                                                Attachment {idx + 1}
                                            </a>
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : (
                            <p className="text-xs text-gray-500">No attachments</p>
                        )}
                    </div>

                    <div className="bg-gray-50 rounded-lg p-3">
                        <h4 className="font-semibold text-sm mb-1">Admin Remarks</h4>
                        <p className="text-sm">
                            {adminRemarks || "—"}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                            Last updated:{" "}
                            {updatedAt
                                ? new Date(updatedAt).toLocaleString()
                                : "N/A"}
                        </p>
                    </div>
                </aside>
            </div>

            {/* Timeline + Comments */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Timeline */}
                <div className="bg-white shadow rounded-xl p-4">
                    <h3 className="text-lg font-semibold mb-3">Timeline</h3>
                    <Timeline events={safeTimeline} />
                </div>

                {/* Comments */}
                <div className="bg-white shadow rounded-xl p-4 flex flex-col">
                    <h3 className="text-lg font-semibold mb-3">Comments</h3>

                    <div className="flex-1 space-y-3 mb-3 overflow-y-auto max-h-80 pr-1">
                        {comments.length === 0 && (
                            <p className="text-sm text-gray-500">
                                No comments yet — be the first to reply.
                            </p>
                        )}

                        {comments.map((c) => (
                            <div
                                className="border border-gray-100 rounded-lg p-2"
                                key={c._id || c.createdAt}
                            >
                                <div className="flex justify-between items-center mb-1">
                                    <strong className="text-sm">
                                        {c.authorName ||
                                            c.author ||
                                            (c.isAdmin ? "Admin" : "You")}
                                    </strong>
                                    <span className="text-xs text-gray-400">
                                        {c.createdAt
                                            ? new Date(c.createdAt).toLocaleString()
                                            : ""}
                                    </span>
                                </div>
                                <div className="text-sm text-gray-700">
                                    {c.text || c.comment}
                                </div>
                            </div>
                        ))}
                    </div>

                    <form onSubmit={handleAddComment} className="space-y-2">
                        <textarea
                            placeholder="Write a comment or reply..."
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            rows={3}
                            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring focus:ring-blue-300"
                        />
                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={sendingComment}
                                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-60"
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
