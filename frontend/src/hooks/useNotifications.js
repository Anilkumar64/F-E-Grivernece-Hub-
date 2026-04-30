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

    return { notifications, unreadCount, reloadNotifications: load };
};

export default useNotifications;
