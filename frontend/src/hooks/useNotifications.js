import { useCallback, useEffect, useState } from "react";
import api from "../api/axiosInstance";

export const useNotifications = () => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    const load = useCallback(async (options = {}) => {
        if (!localStorage.getItem("accessToken")) return;
        try {
            const res = await api.get("/notifications/mine", { params: options });
            setNotifications(res.data.notifications || []);
            setUnreadCount(res.data.unreadCount || 0);
        } catch {
            setNotifications([]);
            setUnreadCount(0);
        }
    }, []);

    useEffect(() => {
        if (!localStorage.getItem("accessToken")) return undefined;
        const start = window.setTimeout(() => load(), 0);
        const interval = window.setInterval(() => load({ unread: true }), 30000);
        return () => {
            window.clearTimeout(start);
            window.clearInterval(interval);
        };
    }, [load]);

    const markAllAsRead = useCallback(async () => {
        // Optimistic UI: clear badge immediately when notification bar is opened.
        setUnreadCount(0);
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        try {
            await api.patch("/notifications/read-all");
        } catch {
            // If API fails, reload from server to restore accurate state.
            await load();
        }
    }, [load]);

    return { notifications, unreadCount, reloadNotifications: load, markAllAsRead };
};

export default useNotifications;
