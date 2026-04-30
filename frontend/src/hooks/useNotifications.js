import { useEffect, useState } from "react";
import api from "../api/axiosInstance";

export const useNotifications = () => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    const load = async () => {
        if (!localStorage.getItem("accessToken")) return;
        try {
            const res = await api.get("/notifications/mine");
            setNotifications(res.data.notifications || []);
            setUnreadCount(res.data.unreadCount || 0);
        } catch {
            setNotifications([]);
            setUnreadCount(0);
        }
    };

    useEffect(() => {
        if (!localStorage.getItem("accessToken")) return undefined;
        load();
        const id = setInterval(load, 30000);
        return () => clearInterval(id);
    }, []);

    return { notifications, unreadCount, reloadNotifications: load };
};

export default useNotifications;
