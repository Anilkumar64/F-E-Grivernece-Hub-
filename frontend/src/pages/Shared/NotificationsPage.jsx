import React from "react";
import api from "../../api/axiosInstance";
import EmptyState from "../../components/common/EmptyState";
import { useNotifications } from "../../hooks/useNotifications";

export default function NotificationsPage() {
    const { notifications, reloadNotifications } = useNotifications();

    const markAll = async () => {
        await api.patch("/notifications/read-all");
        reloadNotifications();
    };

    return (
        <section className="page-section">
            <div className="page-heading">
                <div>
                    <h1>Notifications</h1>
                    <p>Updates from grievance activity and admin replies.</p>
                </div>
                <button className="secondary-btn" onClick={markAll}>Mark All Read</button>
            </div>
            {!notifications.length ? (
                <EmptyState icon="!" title="No notifications yet" />
            ) : (
                <div className="table-card">
                    {notifications.map((item) => (
                        <div className={`notification-row ${item.isRead ? "" : "unread"}`} key={item._id}>
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
