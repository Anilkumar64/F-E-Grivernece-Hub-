import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../../styles/UserStyles/UserNavbar.css";

export default function StudentNavbar() {
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();

    const toggleMenu = () => setOpen(prev => !prev);

    return (
        <nav className="navbar">
            <div className="navbar-inner">

                {/* Brand */}
                <div className="navbar-brand" onClick={() => navigate("/")}>
                    <div className="navbar-logo"></div>
                    <span className="navbar-brand-text">E-Grievance Hub</span>
                </div>

                {/* Desktop */}
                <div className="nav-desktop">
                    <Link to="/" className="nav-link">Home</Link>
                    <Link to="/about" className="nav-link">About</Link>
                    <Link to="/login" className="nav-link">Login</Link>
                    <Link to="/signup" className="nav-link">Signup</Link>

                    <button
                        onClick={() => navigate("/login")}
                        className="nav-primary-btn"
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
                        <Link to="/" className="nav-mobile-link" onClick={() => setOpen(false)}>Home</Link>
                        <Link to="/about" className="nav-mobile-link" onClick={() => setOpen(false)}>About</Link>
                        <Link to="/login" className="nav-mobile-link" onClick={() => setOpen(false)}>Login</Link>
                        <Link to="/signup" className="nav-mobile-link" onClick={() => setOpen(false)}>Signup</Link>

                        <button
                            className="nav-mobile-primary-btn"
                            onClick={() => { setOpen(false); navigate("/login"); }}
                        >
                            File Grievance
                        </button>
                    </div>
                </div>
            )}
        </nav>
    );
}
