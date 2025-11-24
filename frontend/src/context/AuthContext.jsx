import React, { useEffect, useState } from "react";
import axiosInstance from "../api/axiosInstance";
import AuthContext from "./AuthCore";

export const AuthProvider = ({ children }) => {
    const [authUser, setAuthUser] = useState(null);
    const [role, setRole] = useState(null);
    const [accessToken, setAccessToken] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        try {
            const storedUser = localStorage.getItem("authUser");
            const storedToken = localStorage.getItem("accessToken");

            if (storedUser && storedToken) {
                const parsedUser = JSON.parse(storedUser);
                setAuthUser(parsedUser);
                setAccessToken(storedToken);

                if (parsedUser.role) {
                    setRole(parsedUser.role);
                } else if (parsedUser.isSuperAdmin) {
                    setRole("superadmin");
                } else if (parsedUser.isAdmin) {
                    setRole("admin");
                } else {
                    setRole("user");
                }
            }
        } catch (err) {
            console.error("Failed to parse authUser from localStorage", err);
            localStorage.removeItem("authUser");
            localStorage.removeItem("accessToken");
        } finally {
            setLoading(false);
        }
    }, []);

    const setAuthFromResponse = (data, fallbackRole = "user") => {
        const userObj = data.user || data.admin || data.superAdmin || data.authUser || null;
        const token = data.accessToken;

        if (!userObj || !token) {
            console.error("Auth response missing user or accessToken:", data);
            return;
        }

        const resolvedRole =
            userObj.role ||
            (userObj.isSuperAdmin ? "superadmin" : null) ||
            (userObj.isAdmin ? "admin" : null) ||
            fallbackRole;

        setAuthUser(userObj);
        setAccessToken(token);
        setRole(resolvedRole);

        localStorage.setItem("authUser", JSON.stringify(userObj));
        localStorage.setItem("accessToken", token);
    };

    const registerUser = async (payload) => {
        const res = await axiosInstance.post("/api/users/register", payload);
        return res.data;
    };

    const loginUser = async ({ email, password }) => {
        const res = await axiosInstance.post("/api/users/login", { email, password });
        setAuthFromResponse(res.data, "user");
        return res.data;
    };

    const loginAdmin = async ({ email, password }) => {
        const res = await axiosInstance.post("/api/admin/login", { email, password });
        const data = res.data;
        const fallbackRole = data.role || "admin";
        setAuthFromResponse(data, fallbackRole);
        return data;
    };

    const logout = async () => {
        try {
            await axiosInstance.post("/api/admin/logout").catch(() => { });
        } catch (err) {
            console.error("Logout error:", err);
        } finally {
            localStorage.removeItem("accessToken");
            localStorage.removeItem("authUser");

            setAuthUser(null);
            setAccessToken(null);
            setRole(null);

            window.location.href = "/login";
        }
    };

    const isAuthenticated = !!accessToken && !!authUser;

    const value = {
        authUser,
        role,
        accessToken,
        isAuthenticated,
        loading,
        registerUser,
        loginUser,
        loginAdmin,
        logout,
        setAuthFromResponse,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
