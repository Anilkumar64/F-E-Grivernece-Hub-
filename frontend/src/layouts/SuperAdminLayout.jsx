import React from "react";
import { useNavigate, Outlet, useLocation } from "react-router-dom";
import "../styles/SuperAdmin/superAdminLayout.css";

export default function SuperAdminLayout() {
    const navigate = useNavigate();
    const location = useLocation();

    const go = (path) => navigate(path);

    const isActive = (path) =>
        location.pathname.startsWith(path) ? "sa-nav-item active" : "sa-nav-item";

    const handleLogout = () => {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("superadmin");
        navigate("/superadmin/login", { replace: true });
    };

    return (
        <div className="sa-layout-root">
            {/* ================= SIDE BAR ================= */}
            <aside className="sa-sidebar">
                <div className="sa-logo">
                    <div className="sa-logo-circle">E</div>
                    <div>
                        <h3 className="sa-logo-title">E-Grievance Hub</h3>
                        <p className="sa-logo-sub">SuperAdmin</p>
                    </div>
                </div>

                <nav className="sa-nav">
                    <div className="sa-nav-section">MAIN</div>
                    <button className={isActive("/superadmin/dashboard")} onClick={() => go("/superadmin/dashboard")}>
                        📊 Dashboard
                    </button>

                    <div className="sa-nav-section">ADMINS</div>
                    <button className={isActive("/superadmin/pending-admins")} onClick={() => go("/superadmin/pending-admins")}>
                        ⏳ Pending Admins
                    </button>
                    <button className={isActive("/superadmin/admins")} onClick={() => go("/superadmin/admins")}>
                        👥 All Admins
                    </button>

                    <div className="sa-nav-section">STRUCTURE</div>
                    <button className={isActive("/superadmin/manage-departments")} onClick={() => go("/superadmin/manage-departments")}>
                        🏛 Departments
                    </button>
                    <button className={isActive("/superadmin/complaint-types")} onClick={() => go("/superadmin/complaint-types")}>
                        📝 Complaint Types
                    </button>

                    <div className="sa-nav-section">ANALYTICS</div>
                    <button className={isActive("/superadmin/reports")} onClick={() => go("/superadmin/reports")}>
                        📈 Reports
                    </button>

                    <button className="sa-logout-btn" onClick={handleLogout}>
                        🚪 Logout
                    </button>
                </nav>
            </aside>

            <main className="sa-content">
                <Outlet />
            </main>
        </div>
    );
}
