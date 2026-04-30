import React, { useContext, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
    Bell,
    BookOpen,
    Building2,
    CheckCircle2,
    ClipboardList,
    FileBarChart,
    FileText,
    Home,
    Image,
    LayoutDashboard,
    LogOut,
    Menu,
    MessageSquare,
    PlusCircle,
    Search,
    ShieldAlert,
    User,
    Users,
    X,
} from "lucide-react";
import AuthContext from "../../context/AuthCore";
import { useNotifications } from "../../hooks/useNotifications";

const iconSize = 20;

const navItems = {
    student: [
        { label: "Dashboard", path: "/dashboard", icon: Home },
        { label: "Submit Grievance", path: "/submit-grievance", icon: PlusCircle },
        { label: "My Grievances", path: "/my-grievances", icon: ClipboardList },
        { label: "Track Grievance", path: "/my-grievances", icon: Search },
        { label: "Notifications", path: "/notifications", icon: Bell, badge: true },
        { label: "Profile", path: "/profile", icon: User },
    ],
    admin: [
        { label: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
        { label: "All Grievances", path: "/admin/grievances", icon: ClipboardList },
        { label: "Pending", path: "/admin/pending", icon: FileText },
        { label: "Resolved", path: "/admin/resolved", icon: CheckCircle2 },
        { label: "Escalated", path: "/admin/escalated", icon: ShieldAlert },
        { label: "Comments", path: "/admin/comments", icon: MessageSquare },
        { label: "Notifications", path: "/admin/notifications", icon: Bell, badge: true },
        { label: "Profile", path: "/admin/profile", icon: User },
    ],
    superadmin: [
        { label: "Dashboard", path: "/superadmin/dashboard", icon: LayoutDashboard },
        { label: "Manage Admins", path: "/superadmin/admins", icon: Users },
        { label: "Departments", path: "/superadmin/departments", icon: Building2 },
        { label: "Complaint Categories", path: "/superadmin/categories", icon: BookOpen },
        { label: "Landing Page Editor", path: "/superadmin/landing-editor", icon: Image },
        { label: "Reports & Analytics", path: "/superadmin/reports", icon: FileBarChart },
        { label: "Audit Logs", path: "/superadmin/audit-logs", icon: FileText },
        { label: "Profile", path: "/superadmin/profile", icon: User },
    ],
};

const roleLabel = {
    student: "Student",
    admin: "Department Admin",
    superadmin: "Super Admin",
};

const dashboardPath = {
    student: "/dashboard",
    admin: "/admin/dashboard",
    superadmin: "/superadmin/dashboard",
};

const titleFromPath = (pathname) =>
    pathname
        .split("/")
        .filter(Boolean)
        .map((part) => part.replaceAll("-", " "))
        .join(" > ") || "Dashboard";

export default function AppLayout({ role }) {
    const [open, setOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const { authUser, logout } = useContext(AuthContext);
    const { unreadCount } = useNotifications();
    const location = useLocation();
    const navigate = useNavigate();
    const items = useMemo(() => navItems[role] || [], [role]);
    const initials = authUser?.name?.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "U";

    return (
        <div className="app-shell">
            <aside className={`sidebar ${open ? "open" : ""}`}>
                <div className="sidebar-logo" onClick={() => navigate(dashboardPath[role])}>
                    <div className="logo-mark">UG</div>
                    <div className="sidebar-logo-text">
                        <strong>University</strong>
                        <span>E-Grievance</span>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    {items.map(({ label, path, icon: Icon, badge }) => (
                        <NavLink key={path} to={path} onClick={() => setOpen(false)} className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}>
                            {React.createElement(Icon, { size: iconSize })}
                            <span>{label}</span>
                            {badge && unreadCount > 0 && <em>{unreadCount}</em>}
                        </NavLink>
                    ))}
                </nav>

                <div className="sidebar-user">
                    <div className="avatar">{initials}</div>
                    <div>
                        <strong>{authUser?.name || "User"}</strong>
                        {role === "student" && <span>{authUser?.studentId || authUser?.rollNumber || "Student"}</span>}
                        {role === "admin" && <span>{authUser?.department?.name || "Department"}</span>}
                        {role === "superadmin" && <span>Super Admin</span>}
                        <small>{roleLabel[role]}</small>
                    </div>
                </div>
            </aside>

            {open && <button className="sidebar-backdrop" aria-label="Close menu" onClick={() => setOpen(false)} />}

            <div className="main-shell">
                <header className="topbar">
                    <div className="topbar-left">
                        <button className="icon-button mobile-only" aria-label="Open menu" onClick={() => setOpen(true)}>
                            <Menu size={20} />
                        </button>
                        <div className="breadcrumb">{titleFromPath(location.pathname)}</div>
                    </div>
                    <div className="topbar-actions">
                        <button className="icon-button badge-button" aria-label="Notifications" onClick={() => navigate(role === "student" ? "/notifications" : `/${role}/notifications`)}>
                            <Bell size={20} />
                            {unreadCount > 0 && <span>{unreadCount}</span>}
                        </button>
                        <div className="profile-menu">
                            <button className="avatar-button" onClick={() => setProfileOpen((value) => !value)}>{initials}</button>
                            {profileOpen && (
                                <div className="profile-dropdown">
                                    <button onClick={() => navigate(role === "student" ? "/profile" : `/${role}/profile`)}>
                                        <User size={16} /> Profile
                                    </button>
                                    <button onClick={logout}>
                                        <LogOut size={16} /> Logout
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                <main className="content">
                    <Outlet />
                </main>
            </div>

            <button className="drawer-close" aria-label="Close menu" onClick={() => setOpen(false)}>
                <X size={18} />
            </button>
        </div>
    );
}
