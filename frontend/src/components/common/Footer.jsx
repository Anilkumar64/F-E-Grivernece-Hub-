import React from "react";
import { Link } from "react-router-dom";
import "../../styles/UserStyles/UserFooter.css";

export default function Footer() {
    const year = new Date().getFullYear();

    return (
        <footer className="footer">
            <div className="footer-inner">

                {/* Left: Brand */}
                <div className="footer-brand">
                    <div className="footer-logo">EG</div>

                    <div>
                        <h3 className="footer-title">E-Grievance Hub</h3>
                        <p className="footer-description">
                            A modern grievance management platform designed for transparency,
                            accountability, and seamless resolution across campuses.
                        </p>
                    </div>
                </div>

                {/* Right: Meta */}
                <div className="footer-meta">
                    <p className="footer-meta-copy">
                        © {year} E-Grievance Hub — All Rights Reserved.
                    </p>
                    <p className="footer-meta-line">
                        Built with <span className="footer-heart">♥</span> to empower students.
                    </p>
                </div>

            </div>
        </footer>
    );
}
