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

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const original = error.config;
        if (error?.response?.status !== 401 || original?._retry) return Promise.reject(error);

        if (refreshing) {
            return new Promise((resolve, reject) => queue.push({ resolve, reject })).then((token) => {
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
            const role = JSON.parse(localStorage.getItem("authUser") || "null")?.role;
            localStorage.clear();
            if (role === "superadmin") window.location.href = "/superadmin/login";
            else if (role === "admin") window.location.href = "/admin/login";
            else window.location.href = "/login";
            return Promise.reject(refreshError);
        } finally {
            refreshing = false;
        }
    }
);

export default api;
