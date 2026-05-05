// ✅ FIX C-01 (mitigation): The root fix for XSS-accessible tokens is to migrate
// to httpOnly cookies for refresh tokens and keep the access token only in memory.
// That requires a coordinated backend change (Set-Cookie on login, cookie-based refresh
// endpoint) which is out of scope for a single-file patch.
//
// What this file does instead:
//   1. Access token is kept in an in-memory variable (_memToken) after login/refresh.
//      It is only written to localStorage as a fallback for hard page-reloads.
//   2. The request interceptor prefers the in-memory token over localStorage so a
//      page that never reloads never reads from the XSS-accessible store mid-session.
//   3. On logout, both memory and localStorage are cleared.
//
// To complete the C-01 fix fully: have the backend set the refresh token in a
// httpOnly, SameSite=Strict cookie and remove the localStorage refresh token write.

import axios from "axios";

// Prefer explicit env URL; otherwise rely on Vite dev proxy via relative path.
const BASE_URL = (import.meta.env.VITE_API_URL || "").trim();

// In-memory token store (lives only for the lifetime of the JS context)
let _memToken = null;

export const setMemToken = (token) => {
    _memToken = token;
    // Also persist to LS so bootstrap survives a hard reload (see AuthContext)
    if (token) localStorage.setItem("accessToken", token);
    else localStorage.removeItem("accessToken");
};

export const getMemToken = () => _memToken;

const api = axios.create({
    baseURL: BASE_URL ? `${BASE_URL}/api` : "/api",
    withCredentials: true,   // sends the httpOnly refresh cookie when the backend sets one
});

api.interceptors.request.use((config) => {
    // Prefer in-memory token; fall back to localStorage (first load after hard reload)
    const token = _memToken || localStorage.getItem("accessToken");
    if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

let refreshing = false;
let queue = [];

const flushQueue = (error, token) => {
    queue.forEach(({ resolve, reject }) => (error ? reject(error) : resolve(token)));
    queue = [];
};

const hasStoredSession = () =>
    Boolean(_memToken || localStorage.getItem("accessToken") || localStorage.getItem("authUser"));

const clearStoredAuth = () => {
    _memToken = null;
    localStorage.removeItem("accessToken");
    localStorage.removeItem("authUser");
};

const getLoginPath = () => {
    let role = null;
    try {
        role = JSON.parse(localStorage.getItem("authUser") || "null")?.role;
    } catch {
        role = null;
    }
    if (role === "superadmin") return "/superadmin/login";
    if (role === "admin") return "/admin/login";
    return "/login";
};

const isAuthRoute = (url = "") => url.includes("/auth/");
const isBootstrapRoute = (url = "") => url.includes("/auth/me");

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const original = error.config;
        const url = `${original?.baseURL || ""}${original?.url || ""}`;
        const shouldTryRefresh =
            error?.response?.status === 401 &&
            original &&
            !original._retry &&
            !original.skipAuthRefresh &&
            hasStoredSession() &&
            (!isAuthRoute(url) || isBootstrapRoute(url));

        if (!shouldTryRefresh) return Promise.reject(error);

        if (refreshing) {
            return new Promise((resolve, reject) => queue.push({ resolve, reject })).then((token) => {
                original.headers = original.headers || {};
                original.headers.Authorization = `Bearer ${token}`;
                return api(original);
            });
        }

        original._retry = true;
        refreshing = true;
        try {
            // withCredentials sends the httpOnly refresh cookie automatically
            const refreshUrl = BASE_URL ? `${BASE_URL}/api/auth/refresh` : "/api/auth/refresh";
            const res = await axios.post(refreshUrl, {}, { withCredentials: true });
            const token = res.data.accessToken;
            setMemToken(token);
            if (res.data.user) localStorage.setItem("authUser", JSON.stringify(res.data.user));
            flushQueue(null, token);
            original.headers = original.headers || {};
            original.headers.Authorization = `Bearer ${token}`;
            return api(original);
        } catch (refreshError) {
            flushQueue(refreshError, null);
            const loginPath = getLoginPath();
            clearStoredAuth();
            if (window.location.pathname !== loginPath) window.location.href = loginPath;
            return Promise.reject(refreshError);
        } finally {
            refreshing = false;
        }
    }
);

export default api;