import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4400";

const api = axios.create({
    baseURL: `${BASE_URL}/api`,
    withCredentials: true,
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("accessToken");
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

const hasStoredSession = () => Boolean(localStorage.getItem("accessToken") || localStorage.getItem("authUser"));

const clearStoredAuth = () => {
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
            const res = await axios.post(`${BASE_URL}/api/auth/refresh`, {}, { withCredentials: true });
            const token = res.data.accessToken;
            localStorage.setItem("accessToken", token);
            localStorage.setItem("authUser", JSON.stringify(res.data.user));
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
