import React from "react";
import { Link, useNavigate } from "react-router-dom";
import NotificationDropdown from "../components/common/NotificationDropdown";
import Footer from "../components/common/Footer";
import "./AdminLayout.css"; // ⬅️ add this

export default function AdminLayout({ children }) {
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("token");
        localStorage.removeItem("adminToken");
        navigate("/admin/login");
    };

    return (
        <div className="admin-layout">
            {/* SIDEBAR */}
            <aside className="admin-sidebar">
                <div className="admin-sidebar-header">
                    <span className="admin-sidebar-title">
                        Admin Console
                    </span>
                </div>

                <nav className="admin-sidebar-nav">
                    <Link
                        to="/admin/dashboard"
                        className="admin-sidebar-link"
                    >
                        Dashboard
                    </Link>
                    <Link
                        to="/admin/grievances"
                        className="admin-sidebar-link"
                    >
                        All Grievances
                    </Link>
                    <Link
                        to="/admin/pending"
                        className="admin-sidebar-link"
                    >
                        Pending Grievances
                    </Link>
                    <Link
                        to="/admin/manage-types"
                        className="admin-sidebar-link"
                    >
                        Manage Complaint Types
                    </Link>
                    <Link
                        to="/admin/profile"
                        className="admin-sidebar-link"
                    >
                        Profile
                    </Link>
                </nav>

                <div className="admin-sidebar-footer">
                    <button
                        onClick={handleLogout}
                        className="btn-logout-full"
                    >
                        Logout
                    </button>
                </div>
            </aside>

            {/* MAIN */}
            <div className="admin-main">
                <header className="admin-header">
                    <div className="admin-header-left">
                        <span className="admin-header-title">
                            Admin Panel
                        </span>
                    </div>

                    <div className="admin-header-right">
                        <NotificationDropdown />
                        <button
                            onClick={handleLogout}
                            className="btn-logout"
                        >
                            Logout
                        </button>
                    </div>
                </header>

                <main className="admin-content">
                    {children}
                </main>

                <Footer />
            </div>
        </div>
    );
}
