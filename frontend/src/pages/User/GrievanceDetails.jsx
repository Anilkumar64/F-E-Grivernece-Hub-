import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/axiosInstance";
import toast from "react-hot-toast";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";

export default function GrievanceDetails() {
    const { id } = useParams();
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
            const res = await api.get(`/grievances/track/${id}`);
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
        if (!commentText.trim()) return toast("Comment cannot be empty");

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
            await api.patch(`/grievances/request-close/${grievance._id}`);

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
    if (loading) {
        return (
            <section className="space-y-4">
                <Card className="h-28 animate-pulse bg-gray-100" />
                <Card className="h-64 animate-pulse bg-gray-100" />
            </section>
        );
    }
    if (!grievance) return <Card>Grievance not found</Card>;

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
    } = grievance;

    return (
        <section className="space-y-6">
            <Card className="space-y-4">
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">{title}</h1>

                <div className="flex flex-wrap items-center gap-2">
                    <Badge>{status}</Badge>
                    <Badge className="bg-gray-100 text-gray-700">Priority: {priority}</Badge>
                    <Badge className="bg-indigo-50 text-indigo-700">Tracking: {trackingId}</Badge>
                </div>

                <p className="text-sm leading-relaxed text-gray-700">{description}</p>

                <div className="flex flex-wrap gap-3">
                    <Button variant="outline" onClick={() => navigate("/user/my-grievances")}>
                        Back
                    </Button>
                    <Button onClick={handleRequestClose}>Request Close</Button>
                </div>
            </Card>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
                <div className="space-y-6">
                    <Card className="space-y-3">
                        <h2 className="text-lg font-semibold tracking-tight text-gray-900">Timeline</h2>
                        {history.length === 0 ? (
                            <p className="text-sm text-gray-600">No timeline updates yet</p>
                        ) : (
                            <ul className="space-y-3">
                                {history.map((h, i) => (
                                    <li className="rounded-xl border border-gray-100 bg-gray-50 p-3" key={i}>
                                        <strong className="text-sm text-gray-900">{h.action}</strong>
                                        <p className="text-sm text-gray-700">{h.message}</p>
                                        <span className="text-xs text-gray-500">{new Date(h.time).toLocaleString()}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Card>

                    <Card className="space-y-4">
                        <h2 className="text-lg font-semibold tracking-tight text-gray-900">Comments</h2>
                        <div className="space-y-3">
                            {comments.length === 0 ? (
                                <p className="text-sm text-gray-600">No comments yet</p>
                            ) : (
                                comments.map((c) => (
                                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-3" key={c._id}>
                                        <strong className="text-sm text-gray-900">{c.authorName || "User"}</strong>
                                        <p className="text-sm text-gray-700">{c.text}</p>
                                        <span className="text-xs text-gray-500">{new Date(c.createdAt).toLocaleString()}</span>
                                    </div>
                                ))
                            )}
                        </div>

                        <form onSubmit={handleAddComment} className="grid gap-3 md:grid-cols-[1fr_auto]">
                            <textarea
                                className="ui-input min-h-24"
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                placeholder="Write your comment..."
                            />
                            <Button disabled={sendingComment}>
                                {sendingComment ? "Sending..." : "Send"}
                            </Button>
                        </form>
                    </Card>
                </div>

                <aside className="space-y-4">
                    <Card className="space-y-1">
                        <h3 className="text-sm font-semibold text-gray-900">Submitted</h3>
                        <p className="text-sm text-gray-600">{new Date(createdAt).toLocaleString()}</p>
                    </Card>

                    <Card className="space-y-1">
                        <h3 className="text-sm font-semibold text-gray-900">Assigned Admin</h3>
                        {adminAssigned ? (
                            <>
                                <p className="text-sm text-gray-700">{adminAssigned.name}</p>
                                <p className="text-sm text-gray-500">{adminAssigned.email}</p>
                                <p className="text-sm text-gray-500">Dept: {adminAssigned.department?.name || "—"}</p>
                            </>
                        ) : (
                            <p className="text-sm text-gray-500">Not assigned yet</p>
                        )}
                    </Card>

                    <Card className="space-y-2">
                        <h3 className="text-sm font-semibold text-gray-900">Attachments</h3>
                        {attachments.length ? (
                            attachments.map((file, idx) => (
                                <a
                                    className="block text-sm font-medium text-indigo-600 hover:text-indigo-500"
                                    key={idx}
                                    href={file.url || file}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    Attachment {idx + 1}
                                </a>
                            ))
                        ) : (
                            <p className="text-sm text-gray-500">No attachments</p>
                        )}
                    </Card>
                </aside>
            </div>
        </section>
    );
}
