import { useCallback, useContext, useEffect, useState } from "react";
import api from "../api/axiosInstance";
import AuthContext from "../context/AuthCore";

export const useNotifications = () => {
    const { authUser, loading: authLoading } = useContext(AuthContext);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [pushSubscription, setPushSubscription] = useState(null);

    const load = useCallback(async (options = {}) => {
        if (!authUser) return;
        try {
            const res = await api.get("/notifications/mine", { params: options });
            setNotifications(res.data.notifications || []);
            setUnreadCount(res.data.unreadCount || 0);
        } catch {
            setNotifications([]);
            setUnreadCount(0);
        }
    }, [authUser]);

    // Push notification subscription
    const subscribeToPush = useCallback(async () => {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            console.log('Push notifications not supported');
            return false;
        }

        try {
            const registration = await navigator.serviceWorker.ready;
            const existingSubscription = await registration.pushManager.getSubscription();

            if (existingSubscription) {
                setPushSubscription(existingSubscription);
                return true;
            }

            // Get VAPID public key from server
            const response = await api.get('/notifications/vapid-public-key');
            const vapidPublicKey = response.data.publicKey;

            if (!vapidPublicKey) {
                console.log('VAPID keys not configured');
                return false;
            }

            const newSubscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlB64ToUint8Array(vapidPublicKey)
            });

            // Send subscription to server
            await api.post('/notifications/subscribe', {
                endpoint: newSubscription.endpoint,
                keys: {
                    p256dh: arrayBufferToBase64(newSubscription.getKey('p256dh')),
                    auth: arrayBufferToBase64(newSubscription.getKey('auth'))
                }
            });

            setPushSubscription(newSubscription);
            return true;
        } catch (error) {
            console.error('Push subscription failed:', error);
            return false;
        }
    }, []);

    const unsubscribeFromPush = useCallback(async () => {
        if (!pushSubscription) return;

        try {
            await pushSubscription.unsubscribe();
            await api.delete('/notifications/unsubscribe', {
                data: { endpoint: pushSubscription.endpoint }
            });
            setPushSubscription(null);
        } catch (error) {
            console.error('Push unsubscription failed:', error);
        }
    }, [pushSubscription]);

    useEffect(() => {
        if (authLoading || !authUser) {
            setNotifications([]);
            setUnreadCount(0);
            return undefined;
        }
        const start = window.setTimeout(() => load(), 0);
        const interval = window.setInterval(() => load({ unread: true }), 30000);
        const onOnline = () => load();
        window.addEventListener("online", onOnline);

        // Initialize push notifications
        if (Notification.permission === 'granted') {
            subscribeToPush();
        }

        return () => {
            window.clearTimeout(start);
            window.clearInterval(interval);
            window.removeEventListener("online", onOnline);
        };
    }, [authLoading, authUser, load, subscribeToPush]);

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

    const requestNotificationPermission = useCallback(async () => {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                return await subscribeToPush();
            }
        }
        return false;
    }, [subscribeToPush]);

    return {
        notifications,
        unreadCount,
        reloadNotifications: load,
        markAllAsRead,
        pushSubscription,
        subscribeToPush,
        unsubscribeFromPush,
        requestNotificationPermission
    };
};

// Helper functions for push notifications
function urlB64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

export default useNotifications;
