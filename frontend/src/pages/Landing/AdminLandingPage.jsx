import React from "react";
import { Link } from "react-router-dom";
import Navbar from "../../components/landing/AdminLandingNavbar";
import Footer from "../../components/landing/AdminLandingFooter";
import "../../styles/UserStyles/UserLandingpage.css";

export default function AdminLandingPage() {
    return (
        <div className="landing-page">
            <Navbar />

            <main className="landing-main">
                <section className="hero-section">
                    <div className="container hero-grid">
                        <div className="hero-content">
                            <span className="hero-pill">
                                Secure Admin Workspace
                            </span>

                            <h1 className="hero-title">
                                Manage departmental grievances
                                <span className="hero-title-highlight"> quickly and clearly</span>.
                            </h1>

                            <p className="hero-subtitle">
                                Everything you need for handling assigned cases: review evidence, post updates, and resolve complaints on time.
                            </p>

                            <div className="hero-actions">
                                <Link to="/admin/login" className="btn btn-primary">
                                    Admin Login
                                </Link>
                                <Link to="/superadmin/login" className="btn btn-outline">
                                    SuperAdmin Login
                                </Link>
                            </div>

                            <div className="hero-highlights">
                                <div className="hero-highlight-item"><span>Assigned queue by department</span></div>
                                <div className="hero-highlight-item"><span>Priority and SLA visibility</span></div>
                                <div className="hero-highlight-item"><span>Comment and timeline audit trail</span></div>
                            </div>
                        </div>

                        <div className="hero-card-wrapper">
                            <div className="hero-card">
                                <div className="hero-card-header">
                                    <div>
                                        <p className="hero-card-label">Workflow Snapshot</p>
                                        <p className="hero-card-title">What happens after login</p>
                                    </div>
                                    <span className="status-badge">Admin Panel</span>
                                </div>

                                <div className="hero-stats-grid">
                                    <div className="stat-box">
                                        <p className="stat-label">Review</p>
                                        <p className="stat-value">Open</p>
                                    </div>
                                    <div className="stat-box">
                                        <p className="stat-label">Update</p>
                                        <p className="stat-value">Track</p>
                                    </div>
                                    <div className="stat-box">
                                        <p className="stat-label">Close</p>
                                        <p className="stat-value">Resolve</p>
                                    </div>
                                </div>

                                <div className="hero-card-footer">
                                    <p className="hero-card-footer-hint">
                                        Access is provided by SuperAdmin only. No public admin signup.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="section section-why">
                    <div className="container">
                        <div className="section-header center">
                            <h2 className="section-title">Built for Fast Resolution</h2>
                            <p className="section-subtitle">A clean panel focused on operational work, not clutter.</p>
                        </div>

                        <div className="feature-grid">
                            <div className="feature-card">
                                <h3 className="feature-title">Department Queue</h3>
                                <p className="feature-text">See only the grievances relevant to your team.</p>
                            </div>
                            <div className="feature-card">
                                <h3 className="feature-title">Timeline Updates</h3>
                                <p className="feature-text">Post status changes and maintain clear progress history.</p>
                            </div>
                            <div className="feature-card">
                                <h3 className="feature-title">Collaborative Comments</h3>
                                <p className="feature-text">Communicate updates to students in one structured thread.</p>
                            </div>
                        </div>
                    </div>
                </section>
                <section className="section section-faq">
                    <div className="container faq-grid">
                        <div className="cta-card">
                            <h2 className="cta-title">Access the Admin Panel</h2>
                            <p className="cta-text">
                                Admin accounts are created and approved by SuperAdmin. Use your assigned credentials to log in.
                            </p>

                            <div className="cta-actions">
                                <Link to="/admin/login" className="btn btn-primary">
                                    Admin Login
                                </Link>
                                <Link to="/superadmin/login" className="btn btn-outline">
                                    SuperAdmin Portal
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
