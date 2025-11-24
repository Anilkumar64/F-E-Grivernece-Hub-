import React, { useEffect, useState } from "react";
import axiosInstance from "../../api/axiosInstance";
import { toast } from "react-toastify";
import Loader from "../../components/common/Loader";

function NotificationPage() {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    // Fetch notifications
    const fetchNotifications = async () => {
        try {
            const res = await axiosInstance.get("/notifications");
            setNotifications(res.data.notifications || []);
        } catch (err) {
            console.error(err);
            toast.error("Failed to fetch notifications");
        } finally {
            setLoading(false);
        }
    };

    // Mark notification as read
    const markAsRead = async (id) => {
        try {
            await axiosInstance.patch(`/notifications/read/${id}`);
            setNotifications((prev) =>
                prev.map((n) =>
                    n._id === id ? { ...n, isRead: true } : n
                )
            );
        } catch (err) {
            console.error(err);
            toast.error("Failed to update");
        }
    };

    // Delete single notification
    const deleteNotification = async (id) => {
        try {
            await axiosInstance.delete(`/notifications/${id}`);
            setNotifications((prev) => prev.filter((n) => n._id !== id));
            toast.success("Deleted");
        } catch (err) {
            toast.error("Delete failed");
        }
    };

    // Delete all
    const clearAll = async () => {
        try {
            await axiosInstance.delete(`/notifications`);
            setNotifications([]);
            toast.success("Cleared all notifications");
        } catch (err) {
            toast.error("Failed to clear");
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    if (loading) return <Loader />;

    return (
        <div className="max-w-3xl mx-auto p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-semibold">Notifications</h2>

                {notifications.length > 0 && (
                    <button
                        onClick={clearAll}
                        className="bg-red-600 text-white px-4 py-1 rounded hover:bg-red-700"
                    >
                        Clear All
                    </button>
                )}
            </div>

            {notifications.length === 0 ? (
                <p className="text-gray-500 text-lg">No notifications yet.</p>
            ) : (
                <div className="space-y-4">
                    {notifications.map((item) => (
                        <div
                            key={item._id}
                            className={`p-4 rounded-xl shadow border 
                            ${item.isRead ? "bg-gray-100" : "bg-blue-50 border-blue-300"}`}
                        >
                            <div className="flex justify-between">
                                <div>
                                    <h3 className="font-semibold text-lg">{item.title}</h3>
                                    <p className="text-gray-600">{item.message}</p>
                                    <p className="text-xs text-gray-400 mt-2">
                                        {new Date(item.createdAt).toLocaleString()}
                                    </p>
                                </div>

                                <div className="flex flex-col gap-2 items-end">
                                    {!item.isRead && (
                                        <button
                                            onClick={() => markAsRead(item._id)}
                                            className="text-blue-600 hover:text-blue-800 text-sm"
                                        >
                                            Mark as read
                                        </button>
                                    )}

                                    <button
                                        onClick={() => deleteNotification(item._id)}
                                        className="text-red-600 hover:text-red-800 text-sm"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default NotificationPage;
