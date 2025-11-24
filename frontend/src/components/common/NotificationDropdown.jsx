import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../api/axiosInstance";

const NotificationDropdown = () => {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [notifications, setNotifications] = useState([]);

    const ref = useRef(null);
    const navigate = useNavigate();

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    // Fetch latest notifications when dropdown is opened for first time
    useEffect(() => {
        if (open && notifications.length === 0) {
            fetchNotifications();
        }
    }, [open]);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (ref.current && !ref.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const res = await axiosInstance.get("/notifications"); // GET /api/notifications
            const list = res.data?.notifications || res.data || [];
            setNotifications(Array.isArray(list) ? list : []);
        } catch (err) {
            console.error("Notification fetch error:", err);
        } finally {
            setLoading(false);
        }
    };

    const markAllAsRead = async () => {
        try {
            await axiosInstance.patch("/notifications/read-all"); // or whatever your endpoint is
            setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        } catch (err) {
            console.error("Mark all as read failed:", err);
        }
    };

    const goToNotificationsPage = () => {
        setOpen(false);
        navigate("/notifications");
    };

    const toggleDropdown = () => {
        setOpen((prev) => !prev);
    };

    return (
        <div className="relative" ref={ref}>
            {/* Bell Icon */}
            <button
                onClick={toggleDropdown}
                className="relative inline-flex items-center justify-center w-9 h-9 rounded-full hover:bg-gray-100 focus:outline-none"
            >
                {/* Simple bell icon */}
                <span className="text-xl">🔔</span>

                {/* Unread badge */}
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] px-1.5 py-[1px] rounded-full">
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {open && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-50">
                    <div className="flex items-center justify-between px-3 py-2 border-b">
                        <span className="text-sm font-semibold">Notifications</span>
                        <button
                            onClick={fetchNotifications}
                            className="text-xs text-blue-600 hover:underline"
                        >
                            Refresh
                        </button>
                    </div>

                    <div className="max-h-80 overflow-y-auto">
                        {loading ? (
                            <div className="p-4 text-sm text-gray-500">Loading...</div>
                        ) : notifications.length === 0 ? (
                            <div className="p-4 text-sm text-gray-500">
                                No notifications yet.
                            </div>
                        ) : (
                            notifications.slice(0, 10).map((n) => (
                                <div
                                    key={n._id}
                                    className={`px-3 py-2 text-sm border-b last:border-b-0 cursor-pointer ${n.isRead ? "bg-white" : "bg-blue-50"
                                        }`}
                                    onClick={goToNotificationsPage}
                                >
                                    <div className="font-medium text-gray-800 line-clamp-1">
                                        {n.title || "Notification"}
                                    </div>
                                    <div className="text-xs text-gray-600 line-clamp-2">
                                        {n.message || n.body}
                                    </div>
                                    <div className="text-[10px] text-gray-400 mt-1">
                                        {n.createdAt
                                            ? new Date(n.createdAt).toLocaleString()
                                            : ""}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="flex items-center justify-between px-3 py-2 border-t bg-gray-50">
                        <button
                            onClick={markAllAsRead}
                            className="text-xs text-gray-600 hover:text-gray-800"
                        >
                            Mark all as read
                        </button>
                        <button
                            onClick={goToNotificationsPage}
                            className="text-xs text-blue-600 hover:underline"
                        >
                            View all
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationDropdown;
