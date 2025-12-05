import React from "react";
import { Navigate, Outlet } from "react-router-dom";

export default function SuperAdminProtected() {
    let superadmin = null;

    try {
        superadmin = JSON.parse(localStorage.getItem("superadmin"));
    } catch (e) {
        return <Navigate to="/superadmin/login" replace />;
    }

    if (!superadmin || superadmin?.role !== "superadmin") {
        return <Navigate to="/superadmin/login" replace />;
    }

    return <Outlet />;
}
