import React from "react";
import { Link } from "react-router-dom";
import "../../styles/SuperAdmin/SuperAdminFooter.css";

export default function SuperAdminFooter() {
    return (
        <footer className="superadmin-footer">

            {/* SOCIAL ICONS */}
            <div className="superadmin-footer-icons">
                <a href="#"><i className="fab fa-facebook"></i></a>
                <a href="#"><i className="fab fa-instagram"></i></a>
                <a href="#"><i className="fab fa-twitter"></i></a>
                <a href="#"><i className="fab fa-linkedin"></i></a>
                <a href="#"><i className="fab fa-youtube"></i></a>
            </div>

            {/* NAV LINKS */}


            {/* COPYRIGHT */}
            <div className="superadmin-footer-copy">
                © {new Date().getFullYear()} E-Grievance Hub | SuperAdmin Panel
            </div>

        </footer>
    );
}
