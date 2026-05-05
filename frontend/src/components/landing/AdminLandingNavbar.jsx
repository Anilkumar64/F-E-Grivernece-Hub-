import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../../styles/AdminStyles/AdminNavbar.css";

export default function AdminNavbar() {
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();

    const toggleMenu = () => setOpen(prev => !prev);

    return (
        <nav className="admin-navbar">
            <div className="admin-nav-container">
                <div className="admin-brand" onClick={() => navigate("/admin")}>
                    <div className="admin-logo">A</div>
                    <span className="admin-title">E-Grievance Hub</span>
                </div>
                <div className="admin-menu-desktop">
                    <Link to="/admin" className="admin-link">Home</Link>
                    <Link to="/admin/about" className="admin-link">About</Link>
                    <Link to="/admin/login" className="admin-link">Admin Login</Link>
                </div>
                <button className="admin-nav-toggle" onClick={toggleMenu}>
                    {open ? "✖" : "☰"}
                </button>
            </div>
            {open && (
                <div className="admin-menu-mobile">
                    <div className="admin-menu-mobile-inner">
                        <Link
                            className="admin-mobile-link"
                            to="/admin"
                            onClick={() => setOpen(false)}
                        >
                            Home
                        </Link>
                        <Link
                            className="admin-mobile-link"
                            to="/admin/about"
                            onClick={() => setOpen(false)}
                        >
                            About
                        </Link>
                        <Link
                            className="admin-mobile-link"
                            to="/admin/login"
                            onClick={() => setOpen(false)}
                        >
                            Admin Login
                        </Link>
                    </div>
                </div>
            )}
        </nav>
    );
}
