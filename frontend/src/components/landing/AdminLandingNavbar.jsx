import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../../styles/AdminStyles/AdminNavbar.css";

export default function AdminNavbar() {
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();

    const toggleMenu = () => setOpen(prev => !prev);

    return (
        <nav className="navbar admin-navbar">
            <div className="navbar-inner">

                {/* Brand */}
                <div className="navbar-brand" onClick={() => navigate("/admin")}>
                    <div className="navbar-logo"></div>
                    <span className="navbar-brand-text">E-Grievance Hub</span>
                </div>

                {/* Desktop Menu */}
                <div className="nav-desktop">

                    {/* Corrected Admin Home */}
                    <Link to="/admin" className="nav-link">Home</Link>

                    {/* Corrected Admin About */}
                    <Link to="/admin/about" className="nav-link">About</Link>

                    {/* Admin Login */}
                    <Link to="/admin/login" className="nav-link">Admin Login</Link>

                    {/* Corrected Admin Signup */}
                    <Link to="/admin/AdminSignup" className="nav-link">Admin Signup</Link>

                    <button
                        className="nav-primary-btn"
                        onClick={() => navigate("/admin/login")}
                    >
                        File Grievance
                    </button>
                </div>

                {/* Mobile Toggle */}
                <button className="nav-mobile-toggle" onClick={toggleMenu}>
                    {open ? "✖" : "☰"}
                </button>
            </div>

            {/* Mobile Menu */}
            {open && (
                <div className="nav-mobile-menu">
                    <div className="nav-mobile-inner">

                        {/* FIXED: Admin Home */}
                        <Link
                            className="nav-mobile-link"
                            to="/admin"
                            onClick={() => setOpen(false)}
                        >
                            Home
                        </Link>

                        {/* FIXED: Admin About */}
                        <Link
                            className="nav-mobile-link"
                            to="/admin/about"
                            onClick={() => setOpen(false)}
                        >
                            About
                        </Link>

                        {/* Admin Login */}
                        <Link
                            className="nav-mobile-link"
                            to="/admin/login"
                            onClick={() => setOpen(false)}
                        >
                            Admin Login
                        </Link>

                        {/* FIX: Admin Signup */}
                        <Link
                            className="nav-mobile-link"
                            to="/admin/AdminSignup"
                            onClick={() => setOpen(false)}
                        >
                            Admin Signup
                        </Link>

                        <button
                            className="nav-mobile-primary-btn"
                            onClick={() => {
                                setOpen(false);
                                navigate("/admin/login");
                            }}
                        >
                            File Grievance
                        </button>

                    </div>
                </div>
            )}
        </nav>
    );
}
