import React from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axiosInstance";
import EmptyState from "../../components/common/EmptyState";
import { useNotifications } from "../../hooks/useNotifications";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";

export default function NotificationsPage() {
    const navigate = useNavigate();
    const { notifications, reloadNotifications } = useNotifications();
    const [type, setType] = React.useState("");

    const markAll = async () => {
        await api.patch("/notifications/read-all");
        reloadNotifications();
    };

    const filtered = notifications.filter((n) => !type || n.type === type);

    return (
        <section className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">Notifications</h1>
                    <p className="text-sm text-gray-600">Updates from grievance activity and admin replies.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <select className="ui-input" value={type} onChange={(e) => setType(e.target.value)}>
                        <option value="">All Types</option>
                        <option value="status_changed">Status</option>
                        <option value="comment_added">Comments</option>
                        <option value="grievance_escalated">Escalation</option>
                        <option value="feedback_requested">Reopen/Feedback</option>
                        <option value="info">Info</option>
                    </select>
                    <Button variant="outline" onClick={markAll}>Mark All Read</Button>
                </div>
            </div>
            {!filtered.length ? (
                <EmptyState icon="!" title="No notifications yet" />
            ) : (
                <Card className="space-y-3">
                    {filtered.map((item) => (
                        <div
                            className={`rounded-xl border p-4 transition-all duration-200 ${item.isRead ? "border-gray-100 bg-white" : "border-indigo-100 bg-indigo-50/50"}`}
                            key={item._id}
                            onClick={() => {
                                if (item.grievance?.grievanceId) navigate(`/grievance/${item.grievance.grievanceId}`);
                            }}
                            style={{ cursor: item.grievance?.grievanceId ? "pointer" : "default" }}
                        >
                            <div className="mb-2 flex items-center justify-between gap-3">
                                <strong className="text-sm font-semibold capitalize text-gray-900">{item.type.replaceAll("_", " ")}</strong>
                                {!item.isRead && <Badge>New</Badge>}
                            </div>
                            <p className="text-sm text-gray-700">{item.message}</p>
                            <span className="mt-2 block text-xs text-gray-500">{new Date(item.createdAt).toLocaleString()}</span>
                        </div>
                    ))}
                </Card>
            )}
        </section>
    );
}
