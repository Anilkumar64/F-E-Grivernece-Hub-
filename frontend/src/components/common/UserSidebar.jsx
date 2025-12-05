import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../../styles/UserStyles/UserSidebar.css";
export default function UserSidebar({ collapsed, onToggle }) {
    const navigate = useNavigate();
    const location = useLocation();

    const user = JSON.parse(localStorage.getItem("user") || "{}");

    const menu = [
        { label: "Dashboard", path: "/user/dashboard" },
        { label: "My Grievances", path: "/user/my-grievances" },
        { label: "Create Grievance", path: "/user/create-grievance" },
        { label: "Track Grievance", path: "/user/my-grievances" },
    ];

    return (
        <aside className={`user-sidebar ${collapsed ? "collapsed" : ""}`}>

            {/* Header */}
            <div className="user-sidebar-header">
                {!collapsed && <h2 className="brand">E-Grievance</h2>}
                <button className="toggle-btn" onClick={onToggle}>
                    {collapsed ? "»" : "«"}
                </button>
            </div>

            {/* Profile */}
            <div className="user-profile">
                <div className="avatar">{user?.name?.[0]?.toUpperCase() || "U"}</div>

                {!collapsed && (
                    <>
                        <h4 className="user-name">{user?.name || "User"}</h4>
                        <p className="user-email">{user?.email}</p>
                    </>
                )}
            </div>

            {/* Menu */}
            <nav className="user-sidebar-menu">
                {menu.map((item) => (
                    <button
                        key={item.path}
                        className={`user-menu-item ${location.pathname === item.path ? "active" : ""
                            }`}
                        onClick={() => navigate(item.path)}
                    >
                        {!collapsed ? (
                            <span>{item.label}</span>
                        ) : (
                            <span className="dot" title={item.label}></span>
                        )}
                    </button>
                ))}
            </nav>

            {/* Logout */}
            <div className="user-sidebar-footer">
                <button
                    className="logout-btn"
                    onClick={() => {
                        localStorage.removeItem("user");
                        localStorage.removeItem("token");
                        navigate("/login");
                    }}
                >
                    {!collapsed ? "Logout" : "⏏"}
                </button>
            </div>
        </aside>
    );
}
