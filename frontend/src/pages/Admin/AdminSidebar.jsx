import React, { useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../../styles/AdminStyles/Adminsidebar.css";
import AuthContext from "../../context/AuthCore";

export default function AdminSidebar({ collapsed, onToggle }) {
    const navigate = useNavigate();
    const location = useLocation();
    const { authUser, logout } = useContext(AuthContext);

    const name = authUser?.name || authUser?.email?.split("@")[0] || "Admin";
    const initials = name
        .split(" ")
        .map((n) => n[0]?.toUpperCase())
        .join("")
        .slice(0, 2);

    const menu = [
        { label: "Dashboard", path: "/admin/dashboard" },
        { label: "All Grievances", path: "/admin/grievances" },
        { label: "Pending", path: "/admin/pending" },
        { label: "Manage Types", path: "/admin/manage-types" },
        { label: "Profile", path: "/admin/profile" },
    ];

    return (
        <aside className={`admin-sidebar ${collapsed ? "collapsed" : ""}`}>

            {/* HEADER */}
            <div className="admin-sidebar-header">
                {!collapsed && <h2 className="admin-title">Kernel University</h2>}
                <button className="admin-toggle-btn" onClick={onToggle}>
                    {collapsed ? "»" : "«"}
                </button>
            </div>

            {/* PROFILE */}
            <div className="admin-profile">
                <div className="admin-avatar">
                    {authUser?.profilePhoto ? (
                        <img
                            src={authUser.profilePhoto}
                            alt={initials}
                            className="admin-avatar-img"
                        />
                    ) : (
                        initials
                    )}
                </div>
                {!collapsed && (
                    <div>
                        <div className="admin-name">{name}</div>
                        <div className="admin-role">Department Admin</div>
                    </div>
                )}
            </div>

            {/* MENU */}
            <nav className="admin-menu">
                {menu.map((m) => (
                    <button
                        key={m.path}
                        className={`admin-menu-item ${location.pathname === m.path ? "active" : ""}`}
                        onClick={() => navigate(m.path)}
                    >
                        {!collapsed ? m.label : <span className="dot" title={m.label}></span>}
                    </button>
                ))}
            </nav>

            {/* LOGOUT */}
            <button className="admin-logout" onClick={logout}>
                {!collapsed ? "Logout" : "⏏"}
            </button>
        </aside>
    );
}
