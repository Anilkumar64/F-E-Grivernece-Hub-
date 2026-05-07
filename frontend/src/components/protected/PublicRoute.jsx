import React, { useContext } from "react";
import { Navigate, Outlet } from "react-router-dom";
import AuthContext from "../../context/AuthCore";

const homePath = (role) => {
    if (role === "superadmin") return "/superadmin/dashboard";
    if (role === "admin") return "/admin/dashboard";
    return "/dashboard";
};

export default function PublicRoute() {
    const { authUser, loading } = useContext(AuthContext);

    if (loading) {
        return (
            <div className="page-shell">
                <div className="skeleton-card" style={{ margin: 24 }} />
            </div>
        );
    }

    if (authUser) {
        return <Navigate to={homePath(authUser.role)} replace />;
    }

    return <Outlet />;
}
