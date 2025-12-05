import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../../styles/SuperAdmin/SuperAdminNavbar.css";

export default function SuperAdminNavbar() {
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();

    const toggleMenu = () => setOpen(prev => !prev);

    return (
        <nav className="navbar superadmin-navbar">
            <div className="navbar-inner">

                {/* Left: Brand */}
                <div className="navbar-brand" onClick={() => navigate("/superadmin")}>
                    <div className="navbar-logo"></div>
                    <span className="navbar-brand-text">E-Grievance Hub</span>
                </div>

                {/* Desktop Right Side */}
                <div className="nav-desktop">
                    <Link to="/superadmin/login" className="nav-link">
                        Sign-In
                    </Link>
                    <Link to="/admin/about" className="nav-link">
                        About
                    </Link>
                </div>

                {/* Mobile toggle */}
                <button className="nav-mobile-toggle" onClick={toggleMenu}>
                    {open ? "✖" : "☰"}
                </button>

            </div>

            {/* Mobile menu */}
            {open && (
                <div className="nav-mobile-menu">
                    <div className="nav-mobile-inner">

                        <Link
                            to="/superadmin/login"
                            className="nav-mobile-link"
                            onClick={() => setOpen(false)}
                        >
                            SuperAdmin Sign In
                        </Link>

                    </div>
                </div>
            )}
        </nav>
    );
}
