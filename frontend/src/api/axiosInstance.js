import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4400";
const API_BASE = `${BASE_URL}/api`;

const api = axios.create({
    baseURL: API_BASE,
    withCredentials: true,
});

// -------------------------------
// GET TOKEN + USER ROLE
// -------------------------------
const getAuth = () => {
    const superadmin = JSON.parse(localStorage.getItem("superadmin") || "null");
    const admin = JSON.parse(localStorage.getItem("admin") || "null");

    const accessToken =
        localStorage.getItem("accessToken") ||
        localStorage.getItem("token");

    return { superadmin, admin, accessToken };
};

// -------------------------------
// ATTACH TOKEN
// -------------------------------
api.interceptors.request.use((config) => {
    const { accessToken } = getAuth();

    if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
});

// -------------------------------
// REFRESH LOGIC
// -------------------------------
let refreshing = false;
let queue = [];

const handleQueue = (error, token = null) => {
    queue.forEach((p) => {
        if (error) p.reject(error);
        else p.resolve(token);
    });
    queue = [];
};

// -------------------------------
// REFRESH ACCESS TOKEN FUNCTION
// -------------------------------
const refreshToken = async () => {
    const { superadmin, admin } = getAuth();

    // Decide which refresh API to call
    let refreshUrl = null;

    if (superadmin) refreshUrl = `${API_BASE}/superadmin/refresh`;
    if (admin) refreshUrl = `${API_BASE}/admin/refresh`;

    if (!refreshUrl) throw new Error("No user found for refresh");

    const res = await axios.post(refreshUrl, {}, { withCredentials: true });
    return res.data.accessToken;
};

// -------------------------------
// RESPONSE INTERCEPTOR
// -------------------------------
api.interceptors.response.use(
    (response) => response,

    async (error) => {
        const original = error.config;

        if (error?.response?.status === 401 && !original._retry) {
            if (refreshing) {
                return new Promise((resolve, reject) => {
                    queue.push({ resolve, reject });
                }).then((token) => {
                    original.headers.Authorization = `Bearer ${token}`;
                    return api(original);
                });
            }

            original._retry = true;
            refreshing = true;

            try {
                const newToken = await refreshToken();

                localStorage.setItem("accessToken", newToken);
                localStorage.setItem("token", newToken);

                api.defaults.headers.common.Authorization = `Bearer ${newToken}`;
                handleQueue(null, newToken);

                return api(original);
            } catch (err) {
                handleQueue(err, null);

                localStorage.clear();
                window.location.href = "/superadmin/login";
                return Promise.reject(err);
            } finally {
                refreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

export default api;
