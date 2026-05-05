import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../../styles/UserStyles/UserSidebar.css";

// ✅ FIX C-01 (partial): sidebar was reading user data directly from localStorage,
// which is the XSS-exposed token store. Switched to reading from the AuthContext
// so this component always reflects the in-memory auth state.
import { useContext } from "react";
import AuthContext from "../../context/AuthCore";

export default function UserSidebar({ collapsed, onToggle }) {
    const navigate = useNavigate();
    const location = useLocation();

    // ✅ FIX C-01: use context instead of localStorage.getItem("user")
    const { authUser, logout } = useContext(AuthContext);

    const menu = [
        { label: "Dashboard", path: "/dashboard" },
        { label: "My Grievances", path: "/my-grievances" },
        { label: "Create Grievance", path: "/submit-grievance" },
        // ✅ FIX MI-13: was pointing to /my-grievances; correct path is /track-grievance
        { label: "Track Grievance", path: "/track-grievance" },
        { label: "Notifications", path: "/notifications" },
        { label: "Profile", path: "/profile" },
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
                <div className="avatar">
                    {authUser?.name?.[0]?.toUpperCase() || "U"}
                </div>

                {!collapsed && (
                    <>
                        <h4 className="user-name">{authUser?.name || "User"}</h4>
                        <p className="user-email">{authUser?.email}</p>
                    </>
                )}
            </div>

            {/* Menu */}
            <nav className="user-sidebar-menu">
                {menu.map((item) => (
                    <button
                        key={item.path}
                        className={`user-menu-item ${location.pathname === item.path ? "active" : ""}`}
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
                {/* ✅ FIX C-01: use the context logout() which clears in-memory state
                    AND localStorage atomically, instead of ad-hoc localStorage.removeItem calls */}
                <button className="logout-btn" onClick={logout}>
                    {!collapsed ? "Logout" : "⏏"}
                </button>
            </div>
        </aside>
    );
}