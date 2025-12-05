import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import AdminSidebar from "../pages/Admin/AdminSidebar.jsx";
import "../styles/AdminStyles/AdminLayout.css";

export default function AdminLayout() {
    const [collapsed, setCollapsed] = useState(false);

    return (
        <div className="admin-layout">
            <AdminSidebar
                collapsed={collapsed}
                onToggle={() => setCollapsed(!collapsed)}
            />

            <div
                className="admin-main"
                style={{ marginLeft: collapsed ? "80px" : "260px" }}
            >
                <Outlet />
            </div>
        </div>
    );
}
