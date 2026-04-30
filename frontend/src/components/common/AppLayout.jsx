import React, { useContext, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import AuthContext from "../../context/AuthCore";
import { useNotifications } from "../../hooks/useNotifications";

const navItems = {
    student: [
        ["Dashboard", "/dashboard"],
        ["Submit Grievance", "/submit-grievance"],
        ["My Grievances", "/my-grievances"],
        ["Track Grievance", "/my-grievances"],
        ["Notifications", "/notifications"],
        ["Profile", "/profile"],
    ],
    admin: [
        ["Dashboard", "/admin/dashboard"],
        ["All Grievances", "/admin/grievances"],
        ["Pending Grievances", "/admin/pending"],
        ["Resolved Grievances", "/admin/resolved"],
        ["Notifications", "/admin/notifications"],
        ["Profile", "/admin/profile"],
    ],
    superadmin: [
        ["Dashboard", "/superadmin/dashboard"],
        ["Manage Admins", "/superadmin/admins"],
        ["Departments", "/superadmin/departments"],
        ["Complaint Categories", "/superadmin/categories"],
        ["Reports & Analytics", "/superadmin/reports"],
        ["Audit Logs", "/superadmin/audit-logs"],
        ["Profile", "/superadmin/profile"],
    ],
};

const titleFromPath = (pathname) => pathname.split("/").filter(Boolean).pop()?.replaceAll("-", " ") || "Dashboard";

export default function AppLayout({ role }) {
    const [open, setOpen] = useState(false);
    const { authUser, logout } = useContext(AuthContext);
    const { unreadCount } = useNotifications();
    const location = useLocation();
    const navigate = useNavigate();
    const items = useMemo(() => navItems[role] || [], [role]);

    return (
        <div className="app-frame">
            <aside className={`app-sidebar ${open ? "open" : ""}`}>
                <div className="sidebar-brand">E-Grievance</div>
                <nav>
                    {items.map(([label, path]) => (
                        <NavLink key={label} to={path} onClick={() => setOpen(false)}>
                            {label}
                        </NavLink>
                    ))}
                </nav>
            </aside>
            <div className="app-main">
                <header className="topbar">
                    <button className="hamburger" onClick={() => setOpen(true)} aria-label="Open menu">☰</button>
                    <div className="breadcrumb">{titleFromPath(location.pathname)}</div>
                    <div className="top-actions">
                        <button className="bell" onClick={() => navigate(role === "student" ? "/notifications" : `/${role}/notifications`)}>
                            Notifications {unreadCount > 0 && <span>{unreadCount}</span>}
                        </button>
                        <button className="avatar-button" onClick={logout}>{authUser?.name?.[0] || "U"}</button>
                    </div>
                </header>
                <main className="content-wrap">
                    <Outlet />
                </main>
            </div>
            {open && <button className="sidebar-scrim" aria-label="Close menu" onClick={() => setOpen(false)} />}
        </div>
    );
}
