import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Navbar.css"; // ⬅️ import CSS
import About from "../../pages/About";

export default function Navbar() {
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();

    const toggleMenu = () => setOpen((prev) => !prev);

    return (
        <nav className="navbar">
            <div className="navbar-inner">
                {/* Left: Brand */}
                <div
                    className="navbar-brand"
                    onClick={() => navigate("/")}
                >
                    <div className="navbar-logo">
                        EG
                    </div>
                    <span className="navbar-brand-text">
                        E-Grievance Hub
                    </span>
                </div>

                {/* Desktop Links */}
                <div className="nav-desktop">
                    <Link to="/" className="nav-link">
                        Home
                    </Link>

                    <Link to="/About" className="nav-link">
                        About
                    </Link>

                    <Link to="/login" className="nav-link">
                        User Login
                    </Link>

                    <Link to="/signup" className="nav-link">
                        User Signup
                    </Link>

                    <Link to="/admin/login" className="nav-link">
                        Admin Login
                    </Link>

                    <Link to="/superadmin/login" className="nav-link">
                        SuperAdmin
                    </Link>

                    <button
                        onClick={() => navigate("/login")}
                        className="nav-primary-btn"
                    >
                        File Grievance
                    </button>
                </div>

                {/* Mobile menu button */}
                <button
                    className="nav-mobile-toggle"
                    onClick={toggleMenu}
                >
                    <span className="sr-only">Open main menu</span>
                    {open ? (
                        <span className="nav-toggle-icon">&times;</span>
                    ) : (
                        <span className="nav-toggle-icon">&#9776;</span>
                    )}
                </button>
            </div>

            {/* Mobile Menu */}
            {open && (
                <div className="nav-mobile-menu">
                    <div className="nav-mobile-inner">
                        <Link
                            to="/"
                            onClick={() => setOpen(false)}
                            className="nav-mobile-link"
                        >
                            Home
                        </Link>
                        <Link
                            to="/about"
                            onClick={() => setOpen(false)}
                            className="nav-mobile-link"
                        >
                            About
                        </Link>
                        <Link
                            to="/login"
                            onClick={() => setOpen(false)}
                            className="nav-mobile-link"
                        >
                            User Login
                        </Link>
                        <Link
                            to="/signup"
                            onClick={() => setOpen(false)}
                            className="nav-mobile-link"
                        >
                            User Signup
                        </Link>
                        <Link
                            to="/admin/login"
                            onClick={() => setOpen(false)}
                            className="nav-mobile-link"
                        >
                            Admin Login
                        </Link>
                        <Link
                            to="/superadmin/login"
                            onClick={() => setOpen(false)}
                            className="nav-mobile-link"
                        >
                            SuperAdmin
                        </Link>

                        <button
                            onClick={() => {
                                setOpen(false);
                                navigate("/login");
                            }}
                            className="nav-mobile-primary-btn"
                        >
                            File Grievance
                        </button>
                    </div>
                </div>
            )}
        </nav>
    );
}
