import React from "react";
import { Link } from "react-router-dom";
import "../../styles/AdminStyles/AdminFooter.css";

export default function AdminFooter() {
    return (
        <footer className="admin-footer">

            {/* SOCIAL ICONS */}
            <div className="admin-footer-icons">
                <a href="#"><i className="fab fa-facebook"></i></a>
                <a href="#"><i className="fab fa-instagram"></i></a>
                <a href="#"><i className="fab fa-twitter"></i></a>
                <a href="#"><i className="fab fa-linkedin"></i></a>
                <a href="#"><i className="fab fa-youtube"></i></a>
            </div>


            {/* COPYRIGHT */}
            <div className="admin-footer-copy">
                © {new Date().getFullYear()} Kernel University | Admin Panel
            </div>

        </footer>
    );
}
