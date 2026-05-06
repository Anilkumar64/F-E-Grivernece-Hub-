import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../../api/axiosInstance";
import Skeleton from "../../components/common/Skeleton";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";

export default function AdminGrievanceDetails() {
    const { id } = useParams();
    const [grievance, setGrievance] = useState(null);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState("");
    const [message, setMessage] = useState("");
    const [comment, setComment] = useState("");
    const [reopenDecision, setReopenDecision] = useState("approved");
    const [reopenReason, setReopenReason] = useState("");

    const load = useCallback(async () => {
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
    }, [id]);

    useEffect(() => { load(); }, [load]);

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

    const reviewReopen = async (e) => {
        e.preventDefault();
        await api.patch(`/grievances/${grievance._id}/reopen-decision`, {
            decision: reopenDecision,
            reason: reopenReason,
        });
        toast.success("Reopen request reviewed");
        setReopenReason("");
        load();
    };

    if (loading) return <Skeleton rows={4} />;
    if (!grievance) return <Card>Grievance not found</Card>;

    return (
        <section className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
                <div className="space-y-6">
                    <Card className="space-y-3">
                        <button className="inline-flex w-fit rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-700" type="button">
                            {grievance.grievanceId}
                        </button>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900">{grievance.title}</h1>
                        <div className="flex flex-wrap gap-2">
                            <Badge>{grievance.status}</Badge>
                            <Badge className="bg-gray-100 text-gray-700">{grievance.priority}</Badge>
                        </div>
                        <p className="text-sm text-gray-600">Student: {grievance.submittedBy?.name} · {grievance.submittedBy?.email}</p>
                        {grievance.isAcademicUrgent && <Badge className="bg-rose-50 text-rose-700">Academic Urgent</Badge>}
                        <p className="text-sm text-gray-700">{grievance.description}</p>
                    </Card>

                    <form className="ui-card space-y-4" onSubmit={updateStatus}>
                        <h2 className="text-lg font-semibold tracking-tight text-gray-900">Update Status</h2>
                        <div className="grid gap-3 md:grid-cols-2">
                            <label className="grid gap-2 text-sm font-medium text-gray-700">
                                Status
                                <select className="ui-input" value={status} onChange={(e) => setStatus(e.target.value)}>
                                    {["Pending", "UnderReview", "InProgress", "Resolved", "Escalated", "Closed"].map((item) => <option key={item}>{item}</option>)}
                                </select>
                            </label>
                            <label className="grid gap-2 text-sm font-medium text-gray-700">
                                Assigned Admin
                                <input className="ui-input" value={grievance.assignedTo?.name || "Current department queue"} readOnly />
                            </label>
                        </div>
                        <label className="grid gap-2 text-sm font-medium text-gray-700">
                            Required Comment
                            <textarea className="ui-input min-h-24" value={message} onChange={(e) => setMessage(e.target.value)} />
                        </label>
                        <Button>Update Status</Button>
                    </form>

                    {grievance.reopenRequested && (
                        <form className="ui-card space-y-4" onSubmit={reviewReopen}>
                            <h2 className="text-lg font-semibold tracking-tight text-gray-900">Reopen Request Review</h2>
                            <p className="text-sm text-gray-600">{grievance.reopenReason || "No reason provided."}</p>
                            <div className="grid gap-3 md:grid-cols-2">
                                <label className="grid gap-2 text-sm font-medium text-gray-700">Decision
                                    <select className="ui-input" value={reopenDecision} onChange={(e) => setReopenDecision(e.target.value)}>
                                        <option value="approved">Approve</option>
                                        <option value="rejected">Reject</option>
                                    </select>
                                </label>
                                <label className="grid gap-2 text-sm font-medium text-gray-700">Reason
                                    <input className="ui-input" value={reopenReason} onChange={(e) => setReopenReason(e.target.value)} />
                                </label>
                            </div>
                            <Button>Submit Decision</Button>
                        </form>
                    )}

                    <Card className="space-y-4">
                        <h2 className="text-lg font-semibold tracking-tight text-gray-900">Discussion</h2>
                        {(grievance.comments || []).map((item) => (
                            <div className="rounded-xl border border-gray-100 bg-gray-50 p-3" key={item._id}>
                                <strong className="text-sm text-gray-900">{item.postedBy?.name || item.role}</strong>
                                <p className="text-sm text-gray-700">{item.text}</p>
                                <span className="text-xs text-gray-500">{new Date(item.timestamp).toLocaleString()}</span>
                            </div>
                        ))}
                        <form className="grid gap-3 md:grid-cols-[1fr_auto]" onSubmit={reply}>
                            <textarea className="ui-input min-h-24" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Reply to student..." />
                            <Button>Reply</Button>
                        </form>
                    </Card>
                </div>

                <aside>
                    <Card className="space-y-3">
                        <h2 className="text-lg font-semibold tracking-tight text-gray-900">Audit Timeline</h2>
                        {(grievance.timeline || []).map((item) => (
                            <div className="rounded-xl border border-gray-100 bg-gray-50 p-3" key={item._id}>
                                <strong className="text-sm text-gray-900">{item.status}</strong>
                                <p className="text-sm text-gray-700">{item.message || "Status updated"}</p>
                                <span className="text-xs text-gray-500">{new Date(item.timestamp).toLocaleString()}</span>
                            </div>
                        ))}
                    </Card>
                </aside>
            </div>
        </section>
    );
}
