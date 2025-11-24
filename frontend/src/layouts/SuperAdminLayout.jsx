import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import api from "../api/axiosInstance";
import { toast } from "react-toastify";

export default function SuperAdminLayout() {
    const navigate = useNavigate();

    let superadmin = null;
    try {
        superadmin = JSON.parse(localStorage.getItem("superadmin") || "null");
    } catch {
        superadmin = null;
    }

    const handleLogout = async () => {
        try {
            await api.post("/admin/logout", { id: superadmin?._id });
        } catch (err) {
            console.error(err);
        } finally {
            localStorage.removeItem("accessToken");
            localStorage.removeItem("token");
            localStorage.removeItem("superadmin");
            toast.success("Logged out");
            navigate("/superadmin/login", { replace: true });
        }
    };

    const menuItems = [
        { label: "Dashboard", to: "/superadmin/dashboard" },
        { label: "Pending Admins", to: "/superadmin/pending-admins" },
        { label: "Reports & Analytics", to: "/superadmin/reports" },
        { label: "Manage Departments", to: "/superadmin/manage-departments" },
    ];

    return (
        <div className="min-h-screen flex bg-slate-50">
            {/* SIDEBAR */}
            <aside className="w-64 bg-slate-900 text-white flex flex-col">
                <div className="px-4 py-5 border-b border-fuchsia-500">
                    <h1 className="text-xl font-bold text-fuchsia-400">
                        SuperAdmin
                    </h1>
                    <p className="text-xs text-slate-200 mt-1">
                        {superadmin?.name || superadmin?.email || "Super Admin"}
                    </p>
                </div>

                <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
                    {menuItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) =>
                                `block px-3 py-2 rounded-lg text-sm font-medium transition ${isActive
                                    ? "bg-slate-800 text-white"
                                    : "text-slate-200 hover:bg-slate-800/70 hover:text-white"
                                }`
                            }
                        >
                            {item.label}
                        </NavLink>
                    ))}
                </nav>

                <div className="px-4 py-4 border-t border-slate-700">
                    <button
                        onClick={handleLogout}
                        className="w-full text-sm bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg font-medium transition"
                    >
                        Logout
                    </button>
                </div>
            </aside>

            {/* MAIN AREA */}
            <div className="flex-1 flex flex-col">
                <header className="px-6 py-3 border-b border-fuchsia-500 bg-white">
                    <h2 className="text-xl font-bold text-fuchsia-600">
                        SuperAdmin Panel
                    </h2>
                </header>

                <main className="flex-1 p-6 overflow-y-auto">
                    {/* CHILD ROUTES RENDER HERE */}
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
