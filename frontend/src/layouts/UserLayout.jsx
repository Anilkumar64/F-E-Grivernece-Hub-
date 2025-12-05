import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import UserSidebar from "../components/common/UserSidebar";
import "../styles/UserStyles/UserLayout.css";

export default function UserLayout() {
    const [collapsed, setCollapsed] = useState(false);

    return (
        <div className="user-layout">
            <UserSidebar
                collapsed={collapsed}
                onToggle={() => setCollapsed(!collapsed)}
            />

            {/* Right side area */}
            <div
                className="user-main"
                style={{ marginLeft: collapsed ? "80px" : "260px" }}
            >
                <Outlet />
            </div>
        </div>
    );
}
