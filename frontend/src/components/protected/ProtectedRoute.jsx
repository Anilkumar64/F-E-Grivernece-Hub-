import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

export default function ProtectedRoute({ allowedRoles = [] }) {
    const location = useLocation();

    // Extract roles safely
    const user = JSON.parse(localStorage.getItem("user") || "null");
    const admin = JSON.parse(localStorage.getItem("admin") || "null");
    const superadmin = JSON.parse(localStorage.getItem("superadmin") || "null");

    // Determine role
    let role = null;
    if (superadmin?.role === "superadmin") role = "superadmin";
    else if (admin?.role) role = admin.role;
    else if (user?.role) role = user.role;

    // Not logged in
    if (!role) {
        // Superadmin area
        if (allowedRoles.includes("superadmin")) {
            return <Navigate to="/superadmin/login" state={{ from: location }} replace />;
        }
        // Admin area
        if (allowedRoles.includes("admin")) {
            return <Navigate to="/admin/login" state={{ from: location }} replace />;
        }
        // User area
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // If logged in but not allowed
    if (allowedRoles.length && !allowedRoles.includes(role)) {
        if (role === "superadmin") return <Navigate to="/superadmin/dashboard" replace />;
        if (role === "admin") return <Navigate to="/admin/dashboard" replace />;
        if (role === "user") return <Navigate to="/user/dashboard" replace />;
    }

    return <Outlet />;
}
