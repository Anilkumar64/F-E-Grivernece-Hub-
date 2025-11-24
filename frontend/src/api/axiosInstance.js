import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4400";

// Final API base (includes /api prefix for all routes)
const API_BASE = `${BASE_URL}/api`;

const axiosInstance = axios.create({
    baseURL: API_BASE,
    withCredentials: true,
});

// Attach access token on every request
axiosInstance.interceptors.request.use(
    (config) => {
        // Support both "accessToken" and "token" keys
        const accessToken =
            localStorage.getItem("accessToken") ||
            localStorage.getItem("token");

        if (accessToken) {
            config.headers["Authorization"] = `Bearer ${accessToken}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach((promise) => {
        if (error) promise.reject(error);
        else promise.resolve(token);
    });
    failedQueue = [];
};

const refreshAccessToken = async () => {
    try {
        // Call refresh endpoint: POST /api/admin/refresh
        const response = await axios.post(
            `${API_BASE}/admin/refresh`,
            {},
            { withCredentials: true }
        );
        return response.data.accessToken;
    } catch (err) {
        throw err;
    }
};

axiosInstance.interceptors.response.use(
    (res) => res,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then((token) => {
                        originalRequest.headers["Authorization"] = `Bearer ${token}`;
                        return axiosInstance(originalRequest);
                    })
                    .catch((err) => Promise.reject(err));
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                const newAccessToken = await refreshAccessToken();

                // Store under both keys to keep everything in sync
                localStorage.setItem("accessToken", newAccessToken);
                localStorage.setItem("token", newAccessToken);

                axiosInstance.defaults.headers.common["Authorization"] =
                    "Bearer " + newAccessToken;

                processQueue(null, newAccessToken);

                return axiosInstance(originalRequest);
            } catch (err) {
                processQueue(err, null);

                // Clear both possible keys
                localStorage.removeItem("accessToken");
                localStorage.removeItem("token");
                localStorage.removeItem("authUser");
                localStorage.removeItem("user");

                window.location.href = "/login";
                return Promise.reject(err);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

export default axiosInstance;
