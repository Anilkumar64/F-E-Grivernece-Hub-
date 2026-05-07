import axios from "axios";

// Prefer explicit env URL; otherwise rely on Vite dev proxy via relative path.
const BASE_URL = (import.meta.env.VITE_API_URL || "").trim();

// In-memory token store (lives only for the lifetime of the JS context)
let _memToken = null;

export const setMemToken = (token) => {
    _memToken = token;
};

export const getMemToken = () => _memToken;

const api = axios.create({
    baseURL: BASE_URL ? `${BASE_URL}/api` : "/api",
    withCredentials: true,   // sends the httpOnly refresh cookie when the backend sets one
});

api.interceptors.request.use((config) => {
    // Access token is kept in memory only (never localStorage)
    const token = _memToken;
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

const isAuthRoute = (url = "") => url.includes("/auth/");
const isRefreshRoute = (url = "") => url.includes("/auth/refresh");

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
            // If the access token is missing/expired, try refresh using httpOnly cookie.
            // Skip refreshing if we are already calling auth endpoints (except /auth/me which may need refresh),
            // and never try to refresh the refresh call itself.
            (!isAuthRoute(url) || url.includes("/auth/me")) &&
            !isRefreshRoute(url);

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
            flushQueue(null, token);
            original.headers = original.headers || {};
            original.headers.Authorization = `Bearer ${token}`;
            return api(original);
        } catch (refreshError) {
            flushQueue(refreshError, null);
            return Promise.reject(refreshError);
        } finally {
            refreshing = false;
        }
    }
);

export default api;