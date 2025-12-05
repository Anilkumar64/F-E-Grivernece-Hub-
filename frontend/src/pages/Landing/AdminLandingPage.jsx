import React from "react";
import { Link } from "react-router-dom";
import Navbar from "../../components/landing/AdminLandingNavbar";
import Footer from "../../components/landing/AdminLandingFooter";
import "../../styles/UserStyles/UserLandingpage.css";

export default function AdminLandingPage() {
    return (
        <div className="landing-page">
            {/* Navbar */}
            <Navbar />

            <main className="landing-main">
                {/* HERO SECTION */}
                <section className="hero-section">
                    <div className="container hero-grid">

                        {/* LEFT CONTENT */}
                        <div className="hero-content">
                            <span className="hero-pill">
                                🛡 Admin Tools · ⚡ Faster Response · 📊 Clear Insights
                            </span>

                            <h1 className="hero-title">
                                Your centralized hub to manage
                                <span className="hero-title-highlight"> student grievances</span>.
                            </h1>

                            <p className="hero-subtitle">
                                View assigned grievances, update statuses, comment, track
                                timelines, and resolve issues efficiently — all in one place.
                            </p>

                            <div className="hero-actions">
                                <Link to="/admin/AdminSignup" className="btn btn-primary">
                                    Create Admin Account
                                </Link>

                                <Link to="/admin/login" className="btn btn-outline">
                                    Admin Login
                                </Link>
                            </div>

                            <div className="hero-highlights">
                                <div className="hero-highlight-item">
                                    <span>📝 Manage Student Complaints</span>
                                </div>
                                <div className="hero-highlight-item">
                                    <span>📌 Update Status & Timeline</span>
                                </div>
                                <div className="hero-highlight-item">
                                    <span>📨 Comment & Collaborate</span>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT CARD */}
                        <div className="hero-card-wrapper">
                            <div className="hero-card-glow" />
                            <div className="hero-card">

                                <div className="hero-card-header">
                                    <div>
                                        <p className="hero-card-label">Admin Dashboard</p>
                                        <p className="hero-card-title">
                                            Live Grievance Overview
                                        </p>
                                    </div>

                                    <span className="status-badge">Admin Panel</span>
                                </div>

                                <div className="hero-stats-grid">
                                    <div className="stat-box stat-box-blue">
                                        <p className="stat-label">Assigned to You</p>
                                        <p className="stat-value">—</p>
                                    </div>
                                    <div className="stat-box stat-box-green">
                                        <p className="stat-label">Resolved</p>
                                        <p className="stat-value">—</p>
                                    </div>
                                    <div className="stat-box stat-box-amber">
                                        <p className="stat-label">Pending</p>
                                        <p className="stat-value">—</p>
                                    </div>
                                </div>

                                <div className="hero-card-footer">
                                    <p className="hero-card-footer-hint">
                                        Login to view your assigned grievances and start resolving.
                                    </p>
                                </div>

                            </div>
                        </div>
                    </div>
                </section>

                {/* WHY SECTION */}
                <section className="section section-why">
                    <div className="container">
                        <div className="section-header center">
                            <h2 className="section-title">Why Admin Dashboard?</h2>
                            <p className="section-subtitle">
                                Tools built specifically for efficient grievance handling.
                            </p>
                        </div>

                        <div className="feature-grid">
                            <div className="feature-card">
                                <p className="feature-emoji">📥</p>
                                <h3 className="feature-title">Easy Task Intake</h3>
                                <p className="feature-text">
                                    View all grievances assigned to you with filters & priority order.
                                </p>
                            </div>

                            <div className="feature-card">
                                <p className="feature-emoji">📊</p>
                                <h3 className="feature-title">Status Updates</h3>
                                <p className="feature-text">
                                    Update grievance statuses and timelines with one click.
                                </p>
                            </div>

                            <div className="feature-card">
                                <p className="feature-emoji">💬</p>
                                <h3 className="feature-title">Comment System</h3>
                                <p className="feature-text">
                                    Communicate with students through comment threads.
                                </p>
                            </div>

                            <div className="feature-card">
                                <p className="feature-emoji">🚀</p>
                                <h3 className="feature-title">Resolve Faster</h3>
                                <p className="feature-text">
                                    Stay organized with priority levels, reminders, and activity logs.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* HOW IT WORKS */}
                <section className="section section-how">
                    <div className="container">
                        <div className="section-header center">
                            <h2 className="section-title">How Admin Workflow Works</h2>
                            <p className="section-subtitle">
                                A simple system to manage student grievances from start to finish.
                            </p>
                        </div>

                        <div className="steps-grid">
                            <div className="step-card">
                                <div className="step-number">1</div>
                                <h3 className="step-title">Receive Assigned Grievances</h3>
                                <p className="step-text">
                                    Login and view all grievances assigned to your department.
                                </p>
                            </div>

                            <div className="step-card">
                                <div className="step-number">2</div>
                                <h3 className="step-title">Act & Update Progress</h3>
                                <p className="step-text">
                                    Comment, request more info, add timeline updates, change status.
                                </p>
                            </div>

                            <div className="step-card">
                                <div className="step-number">3</div>
                                <h3 className="step-title">Resolve & Close</h3>
                                <p className="step-text">
                                    Mark issue as resolved and notify the student instantly.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* CTA SECTION */}
                <section className="section section-faq">
                    <div className="container faq-grid">
                        <div className="cta-card">
                            <h2 className="cta-title">Join the Admin Panel</h2>
                            <p className="cta-text">
                                Sign up or log in to manage and resolve student grievances efficiently.
                            </p>

                            <div className="cta-actions">
                                <Link to="/admin/signup" className="btn btn-primary">
                                    Admin Signup
                                </Link>

                                <Link to="/admin/login" className="btn btn-outline-dark">
                                    Admin Login
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}
