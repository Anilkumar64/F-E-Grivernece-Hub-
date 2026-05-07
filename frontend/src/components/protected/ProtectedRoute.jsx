import React, { useContext } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import AuthContext from "../../context/AuthCore";

const loginPath = (roles) => {
    if (roles.includes("superadmin")) return "/superadmin/login";
    if (roles.includes("admin")) return "/admin/login";
    return "/login";
};

const homePath = (role) => {
    if (role === "superadmin") return "/superadmin/dashboard";
    if (role === "admin") return "/admin/dashboard";
    return "/dashboard";
};

export default function ProtectedRoute({ allowedRoles = [] }) {
    const location = useLocation();
    const { authUser, loading } = useContext(AuthContext);

    // Still bootstrapping — show skeleton, don't redirect yet
    if (loading) {
        return (
            <div className="page-shell">
                <div className="skeleton-card" style={{ margin: 24 }} />
            </div>
        );
    }

    // Not logged in → send to the correct login page, remembering where they came from
    if (!authUser) {
        return <Navigate to={loginPath(allowedRoles)} state={{ from: location }} replace />;
    }

    // Logged in but wrong role → redirect to their own dashboard
    if (allowedRoles.length && !allowedRoles.includes(authUser.role)) {
        return <Navigate to={homePath(authUser.role)} replace />;
    }

    return <Outlet />;
}