import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

const ProtectedRoute = ({ allowedRoles }) => {
    const location = useLocation();

    let role = null;
    let isAuthenticated = false;

    try {
        const token =
            localStorage.getItem("accessToken") ||
            localStorage.getItem("token");

        if (token) {
            const superadmin = JSON.parse(
                localStorage.getItem("superadmin") || "null"
            );
            const admin = JSON.parse(
                localStorage.getItem("admin") || "null"
            );
            const user = JSON.parse(
                localStorage.getItem("user") || "null"
            );

            if (superadmin) role = "superadmin";
            else if (admin) role = "admin";
            else if (user) role = "user";

            isAuthenticated = !!role;
        }
    } catch (e) {
        console.error("ProtectedRoute auth parse error:", e);
    }

    // 1) Not logged in at all
    if (!isAuthenticated) {
        // if protecting admin/superadmin routes
        if (
            allowedRoles?.includes("admin") ||
            allowedRoles?.includes("superadmin")
        ) {
            return (
                <Navigate
                    to="/admin/login"
                    state={{ from: location }}
                    replace
                />
            );
        }

        // default: user routes
        return (
            <Navigate
                to="/login"
                state={{ from: location }}
                replace
            />
        );
    }

    // 2) Logged in but role not allowed
    if (allowedRoles && !allowedRoles.includes(role)) {
        if (role === "admin" || role === "superadmin") {
            return <Navigate to="/admin/dashboard" replace />;
        }
        if (role === "user") {
            return <Navigate to="/user/dashboard" replace />;
        }
        return <Navigate to="/" replace />;
    }

    // 3) All good – render nested routes
    return <Outlet />;
};

export default ProtectedRoute;
