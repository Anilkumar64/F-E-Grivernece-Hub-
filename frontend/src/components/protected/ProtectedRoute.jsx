import React, { useContext } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import AuthContext from "../../context/AuthCore";

const loginPath = (roles) => {
    if (roles.includes("superadmin")) return "/superadmin/login";
    if (roles.includes("admin")) return "/admin/login";
    return "/login";
};

export default function ProtectedRoute({ allowedRoles = [] }) {
    const location = useLocation();
    const { authUser, loading } = useContext(AuthContext);

    if (loading) return <div className="page-shell"><div className="skeleton-card" /></div>;
    if (!authUser) return <Navigate to={loginPath(allowedRoles)} state={{ from: location }} replace />;
    if (allowedRoles.length && !allowedRoles.includes(authUser.role)) {
        if (authUser.role === "superadmin") return <Navigate to="/superadmin/dashboard" replace />;
        if (authUser.role === "admin") return <Navigate to="/admin/dashboard" replace />;
        return <Navigate to="/dashboard" replace />;
    }
    return <Outlet />;
}
