import React from "react";
import { Navigate } from "react-router-dom";

export default function SuperAdminProtected({ children }) {
    try {
        const superadmin = JSON.parse(localStorage.getItem("superadmin"));
        if (!superadmin) return <Navigate to="/superadmin/login" />;
        if (superadmin?.role?.toLowerCase() !== "superadmin")
            return <Navigate to="/superadmin/login" />;
    } catch {
        return <Navigate to="/superadmin/login" />;
    }

    return children;
}
