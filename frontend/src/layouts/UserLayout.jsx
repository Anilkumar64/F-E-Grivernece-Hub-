import React from "react";
import { Link, useNavigate } from "react-router-dom";
import NotificationDropdown from "../components/common/NotificationDropdown";
import Footer from "../components/common/Footer";
import "./UserLayout.css"; // ← Add CSS file

export default function UserLayout({ children }) {
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("token");
        localStorage.removeItem("adminToken");
        navigate("/login");
    };

    return (
        <div className="ul-layout">
            {/* SIDEBAR */}
            <aside className="ul-sidebar">
                <div className="ul-sidebar-header">
                    <span className="ul-sidebar-title">
                        E-Grievance Hub
                    </span>
                </div>

                <nav className="ul-sidebar-nav">
                    <Link to="/user/dashboard" className="ul-sidebar-link">
                        Dashboard
                    </Link>
                    <Link to="/user/create-grievance" className="ul-sidebar-link">
                        Create Grievance
                    </Link>
                    <Link to="/user/my-grievances" className="ul-sidebar-link">
                        My Grievances
                    </Link>
                    <Link to="/notifications" className="ul-sidebar-link">
                        Notifications
                    </Link>
                </nav>

                <div className="ul-sidebar-footer">
                    <button onClick={handleLogout} className="ul-btn-logout-full">
                        Logout
                    </button>
                </div>
            </aside>

            {/* MAIN AREA */}
            <div className="ul-main">
                {/* HEADER */}
                <header className="ul-header">
                    <div className="ul-header-left">
                        <span className="ul-header-title">User Panel</span>
                    </div>

                    <div className="ul-header-right">
                        <NotificationDropdown />
                        <button onClick={handleLogout} className="ul-btn-logout">
                            Logout
                        </button>
                    </div>
                </header>

                {/* CONTENT */}
                <main className="ul-content">{children}</main>

                {/* FOOTER */}
                <Footer />
            </div>
        </div>
    );
}
