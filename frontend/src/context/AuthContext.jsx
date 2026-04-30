import React, { useCallback, useEffect, useMemo, useState } from "react";
import api from "../api/axiosInstance";
import AuthContext from "./AuthCore";

export const AuthProvider = ({ children }) => {
    const [authUser, setAuthUser] = useState(null);
    const [accessToken, setAccessToken] = useState(localStorage.getItem("accessToken"));
    const [loading, setLoading] = useState(true);

    const persist = useCallback((user, token) => {
        setAuthUser(user);
        setAccessToken(token);
        localStorage.setItem("authUser", JSON.stringify(user));
        if (token) localStorage.setItem("accessToken", token);
    }, [persist]);

    useEffect(() => {
        const bootstrap = async () => {
            const token = localStorage.getItem("accessToken");
            if (!token) {
                localStorage.removeItem("authUser");
                setAuthUser(null);
                setAccessToken(null);
                setLoading(false);
                return;
            }

            try {
                const res = await api.get("/auth/me");
                persist(res.data.user, token);
            } catch {
                localStorage.removeItem("authUser");
                localStorage.removeItem("accessToken");
                setAuthUser(null);
                setAccessToken(null);
            } finally {
                setLoading(false);
            }
        };
        bootstrap();
    }, []);

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
        const res = await api.post("/users/register", payload);
        return res.data;
    }, []);

    const logout = useCallback(async () => {
        const role = authUser?.role;
        await api.post("/auth/logout").catch(() => {});
        localStorage.clear();
        setAuthUser(null);
        setAccessToken(null);
        window.location.href = role === "superadmin" ? "/superadmin/login" : role === "admin" ? "/admin/login" : "/login";
    }, [authUser?.role]);

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
    }), [authUser, accessToken, loading, loginStudent, loginAdmin, loginSuperAdmin, registerUser, logout]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
