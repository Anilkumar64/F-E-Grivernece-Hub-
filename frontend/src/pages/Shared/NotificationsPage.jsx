import React from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axiosInstance";
import EmptyState from "../../components/common/EmptyState";
import { useNotifications } from "../../hooks/useNotifications";

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
        <section className="page-section">
            <div className="page-heading">
                <div>
                    <h1>Notifications</h1>
                    <p>Updates from grievance activity and admin replies.</p>
                </div>
                <div className="split-actions">
                    <select value={type} onChange={(e) => setType(e.target.value)}>
                        <option value="">All Types</option>
                        <option value="status_changed">Status</option>
                        <option value="comment_added">Comments</option>
                        <option value="grievance_escalated">Escalation</option>
                        <option value="feedback_requested">Reopen/Feedback</option>
                        <option value="info">Info</option>
                    </select>
                    <button className="secondary-btn" onClick={markAll}>Mark All Read</button>
                </div>
            </div>
            {!filtered.length ? (
                <EmptyState icon="!" title="No notifications yet" />
            ) : (
                <div className="table-card">
                    {filtered.map((item) => (
                        <div
                            className={`notification-row ${item.isRead ? "" : "unread"}`}
                            key={item._id}
                            onClick={() => {
                                if (item.grievance?.grievanceId) navigate(`/grievance/${item.grievance.grievanceId}`);
                            }}
                            style={{ cursor: item.grievance?.grievanceId ? "pointer" : "default" }}
                        >
                            <strong>{item.type.replaceAll("_", " ")}</strong>
                            <p>{item.message}</p>
                            <span>{new Date(item.createdAt).toLocaleString()}</span>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}
