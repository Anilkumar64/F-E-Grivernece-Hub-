import React, { useContext, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
    Bell, BookOpen, Building2, CheckCircle2, ClipboardList,
    FileBarChart, FileText, Home, Image, LayoutDashboard,
    LogOut, Menu, MessageSquare, PlusCircle, Search,
    ShieldAlert, User, Users, GraduationCap,
    Settings, ShieldCheck,
} from "lucide-react";
import AuthContext from "../../context/AuthCore";
import { useNotifications } from "../../hooks/useNotifications";
import RouteTracker from "./RouteTracker";
import Badge from "../ui/Badge";
import { resolveBrandAsset, useBranding } from "../../hooks/useBranding";

const iconSize = 20;

const navItems = {
    student: [
        { label: "Dashboard", path: "/dashboard", icon: Home },
        { label: "Profile", path: "/profile", icon: User },
        { label: "Submit Grievance", path: "/submit-grievance", icon: PlusCircle },
        { label: "My Drafts", path: "/my-drafts", icon: FileText },
        { label: "My Grievances", path: "/my-grievances", icon: ClipboardList },
        { label: "Track Grievance", path: "/track-grievance", icon: Search },
        { label: "Notifications", path: "/notifications", icon: Bell, badge: true },
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
        { label: "User Lifecycle", path: "/superadmin/users", icon: Users },
        { label: "Departments", path: "/superadmin/departments", icon: Building2 },
        { label: "Manage Courses", path: "/superadmin/courses", icon: GraduationCap },
        { label: "Complaint Categories", path: "/superadmin/categories", icon: BookOpen },
        { label: "Landing Page Editor", path: "/superadmin/landing-editor", icon: Image },
        { label: "Reports & Analytics", path: "/superadmin/reports", icon: FileBarChart },
        { label: "Audit Logs", path: "/superadmin/audit-logs", icon: FileText },
        { label: "Security Settings", path: "/superadmin/settings", icon: Settings },
        { label: "Control Center", path: "/superadmin/control-center", icon: ShieldCheck },
        { label: "Profile", path: "/superadmin/profile", icon: User },
    ],
};

const roleLabel = { student: "Student", admin: "Department Admin", superadmin: "Super Admin" };
const dashboardPath = { student: "/dashboard", admin: "/admin/dashboard", superadmin: "/superadmin/dashboard" };
const apiOrigin = (import.meta.env.VITE_API_URL || "").trim();

// Derive a clean breadcrumb from the current URL path
const titleFromPath = (pathname) =>
    pathname.split("/").filter(Boolean)
        .map((part) => part.replaceAll("-", " "))
        .join(" > ") || "Dashboard";

// Resolve the grievance detail route per role
const grievancePath = (role, grievanceId) => {
    if (role === "student") return `/grievance/${grievanceId}`;
    if (role === "admin") return `/admin/grievance/${grievanceId}`;
    return `/superadmin/grievance/${grievanceId}`;   // ← was broken for superadmin
};

// Resolve the notifications page per role
const notifPath = (role) => {
    if (role === "student") return "/notifications";
    return `/${role}/notifications`;
};

export default function AppLayout({ role }) {
    const [open, setOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const { authUser, logout } = useContext(AuthContext);
    const { universityName, universityLogo } = useBranding();
    const { notifications, unreadCount, markAllAsRead } = useNotifications();
    const location = useLocation();
    const navigate = useNavigate();
    const items = useMemo(() => navItems[role] || [], [role]);
    const initials = authUser?.name?.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase() || "U";
    const rawPhoto = authUser?.profilePhoto || authUser?.avatar || "";
    const profilePhotoSrc = rawPhoto
        ? (rawPhoto.startsWith("http") ? rawPhoto : `${apiOrigin}${rawPhoto}`)
        : "";
    const profileSubline =
        role === "student"
            ? (authUser?.course?.name || authUser?.department?.name || "Student")
            : role === "admin"
                ? (authUser?.department?.name || "Department")
                : "System Administration";

    return (
        <div className="min-h-screen bg-gray-50">
            <RouteTracker />
            <aside className={`fixed inset-y-0 left-0 z-40 w-72 transform bg-slate-900 text-white transition-transform duration-200 lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
                <div className="border-b border-slate-800 px-6 py-5" onClick={() => navigate(dashboardPath[role])}>
                    <div className="flex cursor-pointer items-center gap-3">
                        {universityLogo ? (
                            <img src={resolveBrandAsset(universityLogo)} alt={`${universityName} logo`} className="h-10 w-10 rounded-lg object-cover" />
                        ) : (
                            <div className="ku-logo">
                                {(universityName || "KU").split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() || "").join("") || "KU"}
                            </div>
                        )}
                        <div>
                            <p className="text-sm font-semibold tracking-tight text-white">{universityName}</p>
                            <p className="text-xs text-slate-300">Portal</p>
                        </div>
                    </div>
                </div>

                <div className="m-4 rounded-2xl border border-slate-800 bg-slate-800/60 p-3">
                    <div className="flex items-center gap-3">
                        {profilePhotoSrc ? (
                            <img
                                src={profilePhotoSrc}
                                alt={`${authUser?.name || "User"} profile`}
                                className="h-11 w-11 rounded-full object-cover ring-2 ring-indigo-500/40"
                            />
                        ) : (
                            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white ring-2 ring-indigo-500/40">{initials}</div>
                        )}
                        <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-white">{authUser?.name || "User"}</p>
                            <p className="truncate text-xs text-slate-300">{profileSubline}</p>
                        </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2">
                        <Badge className="bg-indigo-500/15 text-indigo-200">{roleLabel[role]}</Badge>
                        {role === "admin" && (
                            <span className="truncate text-xs text-slate-400">{authUser?.staffId || "Department Profile"}</span>
                        )}
                    </div>
                </div>

                <nav className="space-y-1 px-3 pb-6">
                    {items.map(({ label, path, icon: Icon, badge }) => (
                        <NavLink key={path + label} to={path} onClick={() => setOpen(false)}
                            className={({ isActive }) =>
                                `flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-all duration-200 ${
                                    isActive
                                        ? "bg-indigo-600 text-white"
                                        : "text-slate-200 hover:bg-slate-800 hover:text-white"
                                }`
                            }>
                            {React.createElement(Icon, { size: iconSize, className: "shrink-0" })}
                            <span className="truncate">{label}</span>
                            {badge && unreadCount > 0 && (
                                <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-semibold text-white">
                                    {unreadCount}
                                </span>
                            )}
                        </NavLink>
                    ))}
                </nav>
            </aside>

            {open && <button className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden" aria-label="Close menu" onClick={() => setOpen(false)} />}

            <div className="lg:pl-72">
                <header className="sticky top-0 z-20 border-b border-gray-100 bg-white/80 backdrop-blur">
                    <div className="app-container flex h-16 items-center justify-between">
                        <div className="flex items-center gap-3">
                        <button className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 lg:hidden" aria-label="Open menu" onClick={() => setOpen(true)}>
                            <Menu size={20} />
                        </button>
                        <div className="text-sm font-semibold capitalize tracking-tight text-gray-900">{titleFromPath(location.pathname)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Notifications dropdown */}
                        <div className="relative">
                            <button className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600" aria-label="Notifications"
                                onClick={async () => {
                                    const willOpen = !notificationsOpen;
                                    setNotificationsOpen(willOpen);
                                    if (willOpen && unreadCount > 0) {
                                        await markAllAsRead();
                                    }
                                }}>
                                <Bell size={20} />
                                {unreadCount > 0 && <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">{unreadCount}</span>}
                            </button>
                            {notificationsOpen && (
                                <div className="absolute right-0 mt-2 grid w-80 gap-1 rounded-xl border border-gray-100 bg-white p-2 shadow-md">
                                    <button className="rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50" onClick={async () => { await markAllAsRead(); setNotificationsOpen(false); }}>
                                        Mark all as read
                                    </button>
                                    {notifications.slice(0, 10).map((item) => (
                                        <button className="rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50" key={item._id} onClick={() => {
                                            setNotificationsOpen(false);
                                            navigate(
                                                item.grievance?.grievanceId
                                                    ? grievancePath(role, item.grievance.grievanceId)  // ← fixed
                                                    : notifPath(role)
                                            );
                                        }}>
                                            {item.message}
                                        </button>
                                    ))}
                                    <button className="rounded-lg px-3 py-2 text-left text-sm font-medium text-indigo-700 hover:bg-indigo-50" onClick={() => navigate(notifPath(role))}>View all</button>
                                </div>
                            )}
                        </div>

                        {/* Profile dropdown */}
                        <div className="relative">
                            <button className="inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-indigo-50 text-sm font-semibold text-indigo-700" onClick={() => setProfileOpen((v) => !v)}>
                                {profilePhotoSrc ? (
                                    <img
                                        src={profilePhotoSrc}
                                        alt={`${authUser?.name || "User"} profile`}
                                        className="h-10 w-10 object-cover"
                                    />
                                ) : initials}
                            </button>
                            {profileOpen && (
                                <div className="absolute right-0 mt-2 grid w-44 gap-1 rounded-xl border border-gray-100 bg-white p-2 shadow-md">
                                    <button className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50" onClick={() => { setProfileOpen(false); navigate(role === "student" ? "/profile" : `/${role}/profile`); }}>
                                        <User size={16} /> Profile
                                    </button>
                                    <button className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50" onClick={logout}>
                                        <LogOut size={16} /> Logout
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                    </div>
                </header>

                <main className="app-container py-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}