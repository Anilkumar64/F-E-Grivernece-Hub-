import React, { useEffect, useMemo, useState } from "react";
import api from "../api/axiosInstance";
import AuthContext from "./AuthCore";

export const AuthProvider = ({ children }) => {
    const [authUser, setAuthUser] = useState(null);
    const [accessToken, setAccessToken] = useState(localStorage.getItem("accessToken"));
    const [loading, setLoading] = useState(true);

    const persist = (user, token) => {
        setAuthUser(user);
        setAccessToken(token);
        localStorage.setItem("authUser", JSON.stringify(user));
        if (token) localStorage.setItem("accessToken", token);
    };

    useEffect(() => {
        const bootstrap = async () => {
            try {
                const res = await api.get("/auth/me");
                persist(res.data.user, localStorage.getItem("accessToken"));
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

    const loginStudent = async (payload) => {
        const res = await api.post("/auth/student/login", payload);
        persist(res.data.user, res.data.accessToken);
        return res.data;
    };

    const loginAdmin = async (payload) => {
        const res = await api.post("/auth/admin/login", payload);
        persist(res.data.user, res.data.accessToken);
        return res.data;
    };

    const loginSuperAdmin = async (payload) => {
        const res = await api.post("/auth/superadmin/login", payload);
        persist(res.data.user, res.data.accessToken);
        return res.data;
    };

    const registerUser = async (payload) => {
        const res = await api.post("/users/register", payload);
        return res.data;
    };

    const logout = async () => {
        const role = authUser?.role;
        await api.post("/auth/logout").catch(() => {});
        localStorage.clear();
        setAuthUser(null);
        setAccessToken(null);
        window.location.href = role === "superadmin" ? "/superadmin/login" : role === "admin" ? "/admin/login" : "/login";
    };

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
    }), [authUser, accessToken, loading]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
