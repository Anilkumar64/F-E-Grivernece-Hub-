import React from "react";
import AdminNavbar from "../../components/landing/AdminLandingNavbar";
import Footer from "../../components/landing/AdminLandingFooter";
import "../../styles/AdminStyles/AdminAbout.css";

export default function AdminAbout() {
    return (
        <div className="about-page">
            {/* Navbar */}
            <AdminNavbar />

            <main className="about-main">
                <section className="about-hero">
                    <div className="container">
                        <h1 className="about-title">About the Admin Panel</h1>
                        <p className="about-subtitle">
                            Empowering campus administrators with modern tools to handle student grievances effectively.
                        </p>
                    </div>
                </section>

                <section className="about-section">
                    <div className="container about-grid">
                        <div className="about-card">
                            <h2 className="about-card-title">📥 Grievance Management</h2>
                            <p className="about-card-text">
                                Admins can view, sort, and manage grievances assigned to their department.
                                Each complaint comes with timeline updates, attachments, comments, and status options.
                            </p>
                        </div>

                        <div className="about-card">
                            <h2 className="about-card-title">📌 Status Updates & Tracking</h2>
                            <p className="about-card-text">
                                Admins can update the progress of grievances, mark resolutions,
                                and maintain a transparent log of actions for accountability.
                            </p>
                        </div>

                        <div className="about-card">
                            <h2 className="about-card-title">💬 Commenting System</h2>
                            <p className="about-card-text">
                                Communicate directly with students through comments and feedback,
                                ensuring clarity and smooth grievance resolution.
                            </p>
                        </div>

                        <div className="about-card">
                            <h2 className="about-card-title">⚙ Manage Complaint Types</h2>
                            <p className="about-card-text">
                                Admins can manage complaint categories and types for better classification
                                and faster redirection of issues.
                            </p>
                        </div>

                        <div className="about-card">
                            <h2 className="about-card-title">📊 Organized Dashboard</h2>
                            <p className="about-card-text">
                                The admin dashboard gives a quick snapshot of pending, resolved, and in-progress grievances.
                            </p>
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}
