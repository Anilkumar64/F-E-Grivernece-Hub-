import React from "react";
import { Link } from "react-router-dom";
import Navbar from "../../components/landing/SuperAdminLandingNavbar";
import Footer from "../../components/landing/SuperAdminLandingFooter";
import SuperAdminNavbar from "../../components/landing/SuperAdminLandingNavbar";

export default function SuperAdminLandingPage() {
    return (
        <div className="landing-page">
            {/* Navbar */}
            <SuperAdminNavbar />

            <main className="landing-main">

                {/* HERO SECTION */}
                <section className="hero-section">
                    <div className="container hero-grid">

                        {/* LEFT CONTENT */}
                        <div className="hero-content">
                            <span className="hero-pill">
                                🏛 Governance · 📊 Analytics · 🔐 Control
                            </span>

                            <h1 className="hero-title">
                                Lead your campus with
                                <span className="hero-title-highlight"> full visibility</span>.
                            </h1>

                            <p className="hero-subtitle">
                                Manage admins, monitor campus grievance activity, configure
                                departments and complaint types, and ensure a transparent,
                                accountable environment.
                            </p>



                            <div className="hero-highlights">
                                <div className="hero-highlight-item">
                                    <span>📊 Campus-wide analytics</span>
                                </div>
                                <div className="hero-highlight-item">
                                    <span>🧑‍💼 Approve / Reject admin accounts</span>
                                </div>
                                <div className="hero-highlight-item">
                                    <span>🏷 Manage departments & categories</span>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT CARD */}
                        <div className="hero-card-wrapper">
                            <div className="hero-card-glow" />
                            <div className="hero-card">

                                <div className="hero-card-header">
                                    <div>
                                        <p className="hero-card-label">SuperAdmin Panel</p>
                                        <p className="hero-card-title">
                                            Campus Control Center
                                        </p>
                                    </div>
                                    <span className="status-badge">Master Panel</span>
                                </div>

                                <div className="hero-stats-grid">
                                    <div className="stat-box stat-box-blue">
                                        <p className="stat-label">Total Complaints</p>
                                        <p className="stat-value">—</p>
                                    </div>
                                    <div className="stat-box stat-box-purple">
                                        <p className="stat-label">Admins Pending Approval</p>
                                        <p className="stat-value">—</p>
                                    </div>
                                    <div className="stat-box stat-box-green">
                                        <p className="stat-label">Resolved Campus-wide</p>
                                        <p className="stat-value">—</p>
                                    </div>
                                </div>

                                <div className="hero-card-footer">
                                    <p className="hero-card-footer-hint">
                                        Login to manage campus, admins, and grievance flow.
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
                            <h2 className="section-title">Why SuperAdmin Panel?</h2>
                            <p className="section-subtitle">
                                The control center for governance, security, and smooth operations.
                            </p>
                        </div>

                        <div className="feature-grid">

                            <div className="feature-card">
                                <p className="feature-emoji">🧑‍💼</p>
                                <h3 className="feature-title">Approve Admin Accounts</h3>
                                <p className="feature-text">
                                    Manage admin requests and decide who can access departmental dashboards.
                                </p>
                            </div>

                            <div className="feature-card">
                                <p className="feature-emoji">🏷</p>
                                <h3 className="feature-title">Configure Departments</h3>
                                <p className="feature-text">
                                    Add or remove departments, complaint types, and enforce structure across campus.
                                </p>
                            </div>

                            <div className="feature-card">
                                <p className="feature-emoji">📊</p>
                                <h3 className="feature-title">Analytics Dashboard</h3>
                                <p className="feature-text">
                                    View campus grievance trends, heatmaps, resolutions, and workload.
                                </p>
                            </div>

                            <div className="feature-card">
                                <p className="feature-emoji">🛡</p>
                                <h3 className="feature-title">High-level Control</h3>
                                <p className="feature-text">
                                    Monitor all admins, track performance, and enforce transparency.
                                </p>
                            </div>

                        </div>
                    </div>
                </section>

                {/* HOW IT WORKS */}
                <section className="section section-how">
                    <div className="container">
                        <div className="section-header center">
                            <h2 className="section-title">How SuperAdmin Works</h2>
                            <p className="section-subtitle">
                                Oversee the entire system with control and clarity.
                            </p>
                        </div>

                        <div className="steps-grid">

                            <div className="step-card">
                                <div className="step-number">1</div>
                                <h3 className="step-title">Approve Admin Requests</h3>
                                <p className="step-text">
                                    Only verified personnel get admin access — secure campus operations.
                                </p>
                            </div>

                            <div className="step-card">
                                <div className="step-number">2</div>
                                <h3 className="step-title">Configure System Entities</h3>
                                <p className="step-text">
                                    Create/update departments, categories, and manage institutional structure.
                                </p>
                            </div>

                            <div className="step-card">
                                <div className="step-number">3</div>
                                <h3 className="step-title">Monitor Campus Analytics</h3>
                                <p className="step-text">
                                    Get data-driven insights about complaints, trends, and resolutions.
                                </p>
                            </div>

                        </div>
                    </div>
                </section>

                {/* CTA SECTION */}
                <section className="section section-faq">
                    <div className="container faq-grid">
                        <div className="cta-card">
                            <h2 className="cta-title">SuperAdmin Access</h2>
                            <p className="cta-text">
                                Login to manage your campus-level grievance system.
                            </p>
                            <Link to="/superadmin/login" className="btn btn-primary">
                                SuperAdmin Login
                            </Link>
                        </div>
                    </div>
                </section>

            </main>

            <Footer />
        </div>
    );
}
