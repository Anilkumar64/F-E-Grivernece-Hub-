import React, {
    useContext,
    useEffect,
    useState,
} from "react";
import axiosInstance from "../api/axiosInstance";
import AuthContext from "./AuthCore";
import NotificationContext from "./NotificationCore.jsx";

export const NotificationProvider = ({ children }) => {
    const { isAuthenticated, loading: authLoading } = useContext(AuthContext);

    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const calculateUnread = (list) =>
        list.filter((n) => !n.read && !n.isRead && n.status !== "read").length;

    // 🔹 Fetch notifications from backend
    const fetchNotifications = async () => {
        if (!isAuthenticated) return;

        setLoading(true);
        setError(null);

        try {
            const res = await axiosInstance.get("/api/notifications/");
            const data = res.data.notifications || res.data.data || res.data || [];

            setNotifications(data);
            setUnreadCount(calculateUnread(data));
        } catch (err) {
            console.error("Failed to fetch notifications:", err);
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    // 🔹 Mark single notification as read
    const markAsRead = async (id) => {
        try {
            await axiosInstance.patch(`/api/notifications/read/${id}`);

            setNotifications((prev) => {
                const updated = prev.map((n) =>
                    n._id === id
                        ? { ...n, read: true, isRead: true, status: "read" }
                        : n
                );
                setUnreadCount(calculateUnread(updated));
                return updated;
            });
        } catch (err) {
            console.error("Failed to mark notification as read:", err);
        }
    };

    // 🔹 Delete a notification
    const deleteNotification = async (id) => {
        try {
            await axiosInstance.delete(`/api/notifications/${id}`);

            setNotifications((prev) => {
                const updated = prev.filter((n) => n._id !== id);
                setUnreadCount(calculateUnread(updated));
                return updated;
            });
        } catch (err) {
            console.error("Failed to delete notification:", err);
        }
    };

    // 🔹 Auto-fetch when auth becomes ready
    useEffect(() => {
        if (authLoading) return;

        if (!isAuthenticated) {
            setNotifications([]);
            setUnreadCount(0);
            setError(null);
            return;
        }

        fetchNotifications();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authLoading, isAuthenticated]);

    const value = {
        notifications,
        unreadCount,
        loading,
        error,
        fetchNotifications,
        markAsRead,
        deleteNotification,
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
};

// Hook moved to its own file to keep this file exporting only components.
// import and use the hook from './useNotificationContext' instead.

export default NotificationProvider;
