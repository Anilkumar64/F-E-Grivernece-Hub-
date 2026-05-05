import React, { useCallback, useEffect, useMemo, useState } from "react";
import api, { setMemToken } from "../api/axiosInstance";
import AuthContext from "./AuthCore";

// ✅ FIX MO-08: original bootstrap caught ALL errors from /auth/me with a single
// empty catch block. When the stored access token had expired, the 401 response
// cleared auth state correctly — BUT the axiosInstance interceptor tried to refresh
// the token first, which could fail silently, leaving loading=true and rendering a
// permanent blank screen.
//
// Fix: explicitly check for a 401 from /auth/me (expired token) and clear state
// immediately without waiting for a refresh cycle that is unlikely to succeed on
// the very first load. The interceptor still handles mid-session expiry as before.

const isTokenExpiredError = (err) =>
    err?.response?.status === 401 ||
    err?.name === "TokenExpiredError";

export const AuthProvider = ({ children }) => {
    const [authUser, setAuthUser] = useState(null);
    const [accessToken, setAccessToken] = useState(null); // do NOT read from LS here; bootstrap does it
    const [loading, setLoading] = useState(true);

    const persist = useCallback((user, token) => {
        setAuthUser(user);
        setAccessToken(token);
        setMemToken(token);   // FIX B1: sync token into axios in-memory store
        localStorage.setItem("authUser", JSON.stringify(user));
        if (token) localStorage.setItem("accessToken", token);
    }, []);

    const clearAuth = useCallback(() => {
        localStorage.removeItem("authUser");
        localStorage.removeItem("accessToken");
        setMemToken(null);  // FIX B1: clear in-memory token
        setAuthUser(null);
        setAccessToken(null);
    }, []);

    useEffect(() => {
        const bootstrap = async () => {
            const token = localStorage.getItem("accessToken");
            if (!token) {
                clearAuth();
                setLoading(false);
                return;
            }

            try {
                const res = await api.get("/auth/me", { skipAuthRefresh: true });
                persist(res.data.user, token);
            } catch (err) {
                // ✅ FIX MO-08: on 401 (expired/invalid token) clear immediately.
                // For any other error (network down, 500) we still clear to be safe,
                // but log it so developers can diagnose issues.
                if (!isTokenExpiredError(err)) {
                    console.warn("Auth bootstrap failed:", err?.message || err);
                }
                clearAuth();
            } finally {
                setLoading(false);
            }
        };
        bootstrap();
    }, [persist, clearAuth]);

    useEffect(() => {
        const revalidateSession = async () => {
            const token = localStorage.getItem("accessToken");
            if (!token) {
                clearAuth();
                return;
            }
            try {
                const res = await api.get("/auth/me", { skipAuthRefresh: true });
                persist(res.data.user, token);
            } catch {
                clearAuth();
            }
        };

        const onPageShow = () => {
            // Handles browser back/forward cache restores.
            revalidateSession();
        };
        const onVisibilityChange = () => {
            if (document.visibilityState === "visible") revalidateSession();
        };

        window.addEventListener("pageshow", onPageShow);
        document.addEventListener("visibilitychange", onVisibilityChange);
        return () => {
            window.removeEventListener("pageshow", onPageShow);
            document.removeEventListener("visibilitychange", onVisibilityChange);
        };
    }, [persist, clearAuth]);

    const loginStudent = useCallback(async (payload) => {
        const res = await api.post("/auth/student/login", payload);
        persist(res.data.user, res.data.accessToken);
        return res.data;
    }, [persist]);

    const loginAdmin = useCallback(async (payload) => {
        const res = await api.post("/auth/admin/login", payload);
        persist(res.data.user, res.data.accessToken);
        return res.data;
    }, [persist]);

    const loginSuperAdmin = useCallback(async (payload) => {
        const res = await api.post("/auth/superadmin/login", payload);
        persist(res.data.user, res.data.accessToken);
        return res.data;
    }, [persist]);

    const registerUser = useCallback(async (payload) => {
        const res = await api.post("/auth/student/register", payload);
        return res.data;
    }, []);

    const logout = useCallback(async () => {
        const role = authUser?.role;
        await api.post("/auth/logout").catch(() => { });
        // BUG FIX: was localStorage.clear() + manual setState.
        // Must call clearAuth() so setMemToken(null) is also invoked —
        // otherwise _memToken survives the logout, the next /auth/me bootstrap
        // succeeds with the old token, and the new user cannot log in.
        clearAuth();
        window.location.replace(
            role === "superadmin" ? "/superadmin/login" :
                role === "admin" ? "/admin/login" : "/login"
        );
    }, [authUser?.role, clearAuth]);

    const updateAuthUser = useCallback((nextUser) => {
        if (!nextUser) return;
        setAuthUser(nextUser);
        localStorage.setItem("authUser", JSON.stringify(nextUser));
    }, []);

    const value = useMemo(() => ({
        authUser,
        role: authUser?.role || null,
        accessToken,
        loading,
        isAuthenticated: Boolean(authUser),
        loginStudent,
        loginUser: loginStudent,
        loginAdmin,
        loginSuperAdmin,
        registerUser,
        logout,
        updateAuthUser,
    }), [authUser, accessToken, loading, loginStudent, loginAdmin, loginSuperAdmin, registerUser, logout, updateAuthUser]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;