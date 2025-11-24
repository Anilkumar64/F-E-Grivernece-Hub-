import React from "react";
import { Link } from "react-router-dom";
import Navbar from "../../components/common/Navbar";
import Footer from "../../components/common/Footer";
import "./LandingPage.css"; // ⬅️ import the CSS file

export default function LandingPage() {
    return (
        <div className="landing-page">
            {/* Top Nav */}
            <Navbar />

            {/* Page content */}
            <main className="landing-main">
                {/* HERO SECTION */}
                <section className="hero-section">
                    <div className="container hero-grid">
                        {/* Left: Text */}
                        <div className="hero-content">
                            <span className="hero-pill">
                                🎓 Campus · 🛡 Transparency · ⚡ Fast Resolution
                            </span>

                            <h1 className="hero-title">
                                A smarter way to handle
                                <span className="hero-title-highlight"> student grievances</span>.
                            </h1>

                            <p className="hero-subtitle">
                                E-Grievance Hub is a unified platform where students can
                                safely raise issues, admins can manage cases efficiently,
                                and superadmins can monitor campus-wide well-being in real time.
                            </p>

                            <div className="hero-actions">
                                <Link
                                    to="/signup"
                                    className="btn btn-primary"
                                >
                                    Get Started as Student
                                </Link>

                                <Link
                                    to="/login"
                                    className="btn btn-outline"
                                >
                                    Already have an account? Login
                                </Link>
                            </div>

                            <div className="hero-highlights">
                                <div className="hero-highlight-item">
                                    <span>✅ Anonymous complaints supported</span>
                                </div>
                                <div className="hero-highlight-item">
                                    <span>✅ Real-time tracking &amp; timeline</span>
                                </div>
                                <div className="hero-highlight-item">
                                    <span>✅ Role-based access for Admin &amp; SuperAdmin</span>
                                </div>
                            </div>
                        </div>

                        {/* Right: Card / Illustration */}
                        <div className="hero-card-wrapper">
                            <div className="hero-card-glow" />
                            <div className="hero-card">
                                <div className="hero-card-header">
                                    <div>
                                        <p className="hero-card-label">Live Overview</p>
                                        <p className="hero-card-title">
                                            Campus Grievance Snapshot
                                        </p>
                                    </div>
                                    <span className="status-badge">
                                        Online
                                    </span>
                                </div>

                                <div className="hero-stats-grid">
                                    <div className="stat-box stat-box-blue">
                                        <p className="stat-label">
                                            Total Complaints
                                        </p>
                                        <p className="stat-value">
                                            128
                                        </p>
                                    </div>
                                    <div className="stat-box stat-box-green">
                                        <p className="stat-label">
                                            Resolved
                                        </p>
                                        <p className="stat-value">
                                            94
                                        </p>
                                    </div>
                                    <div className="stat-box stat-box-amber">
                                        <p className="stat-label">
                                            In Progress
                                        </p>
                                        <p className="stat-value">
                                            21
                                        </p>
                                    </div>
                                </div>

                                <div className="hero-card-footer">
                                    <p className="hero-card-footer-label">
                                        Quick access for:
                                    </p>
                                    <div className="hero-card-links">
                                        <Link
                                            to="/admin/login"
                                            className="chip-link"
                                        >
                                            Admin Login
                                        </Link>
                                        <Link
                                            to="/superadmin/login"
                                            className="chip-link chip-link-purple"
                                        >
                                            SuperAdmin Login
                                        </Link>
                                        <Link
                                            to="/login"
                                            className="chip-link chip-link-green"
                                        >
                                            Student Login
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* WHY SECTION */}
                <section className="section section-why">
                    <div className="container">
                        <div className="section-header center">
                            <h2 className="section-title">
                                Why E-Grievance Hub?
                            </h2>
                            <p className="section-subtitle">
                                Replace messy spreadsheets, WhatsApp messages, and lost emails
                                with a transparent, trackable grievance system built for campuses.
                            </p>
                        </div>

                        <div className="feature-grid">
                            <div className="feature-card">
                                <p className="feature-emoji">🎓</p>
                                <h3 className="feature-title">
                                    Student-friendly
                                </h3>
                                <p className="feature-text">
                                    Simple login, clear forms, anonymous option, and live
                                    tracking — students always know what’s happening.
                                </p>
                            </div>
                            <div className="feature-card">
                                <p className="feature-emoji">🛠️</p>
                                <h3 className="feature-title">
                                    Admin workflow
                                </h3>
                                <p className="feature-text">
                                    Admins get a focused dashboard, filters, statuses, and
                                    timeline to resolve issues faster.
                                </p>
                            </div>
                            <div className="feature-card">
                                <p className="feature-emoji">📊</p>
                                <h3 className="feature-title">
                                    SuperAdmin insights
                                </h3>
                                <p className="feature-text">
                                    High-level view of departments, complaint categories,
                                    admins, and campus health.
                                </p>
                            </div>
                            <div className="feature-card">
                                <p className="feature-emoji">🔐</p>
                                <h3 className="feature-title">
                                    Secure &amp; Role-based
                                </h3>
                                <p className="feature-text">
                                    Separate logins for students, admins, and superadmins with
                                    JWT auth and protected routes.
                                </p>
                            </div>
                            <div className="feature-card">
                                <p className="feature-emoji">⚡</p>
                                <h3 className="feature-title">
                                    Fast resolution
                                </h3>
                                <p className="feature-text">
                                    Priorities, timelines, comments, and notifications keep
                                    everyone aligned on next actions.
                                </p>
                            </div>
                            <div className="feature-card">
                                <p className="feature-emoji">📨</p>
                                <h3 className="feature-title">
                                    Transparent communication
                                </h3>
                                <p className="feature-text">
                                    Every action leaves a trace: comments, status changes,
                                    and admin remarks — no more “I didn’t know”.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* HOW IT WORKS */}
                <section className="section section-how">
                    <div className="container">
                        <div className="section-header center">
                            <h2 className="section-title">
                                How it works
                            </h2>
                            <p className="section-subtitle">
                                A simple 3-step flow from student complaint to resolved outcome.
                            </p>
                        </div>

                        <div className="steps-grid">
                            <div className="step-card">
                                <div className="step-number">1</div>
                                <h3 className="step-title">
                                    Student files grievance
                                </h3>
                                <p className="step-text">
                                    Student logs in, selects department &amp; complaint type,
                                    adds description, priority, attachments, and submits.
                                </p>
                            </div>
                            <div className="step-card">
                                <div className="step-number">2</div>
                                <h3 className="step-title">
                                    Admin reviews &amp; responds
                                </h3>
                                <p className="step-text">
                                    Assigned admin views grievance, adds comments, changes
                                    status, and updates the timeline as they act.
                                </p>
                            </div>
                            <div className="step-card">
                                <div className="step-number">3</div>
                                <h3 className="step-title">
                                    Resolution &amp; transparency
                                </h3>
                                <p className="step-text">
                                    Student tracks progress, requests closure if satisfied.
                                    SuperAdmin monitors patterns and improves policies.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ROLES SECTION */}
                <section className="section section-roles">
                    <div className="container">
                        <div className="roles-grid">
                            {/* Student */}
                            <div className="role-card role-student">
                                <h3 className="role-title">
                                    For Students
                                </h3>
                                <p className="role-tagline">
                                    A safe channel to be heard.
                                </p>
                                <ul className="role-list">
                                    <li>• File grievances in minutes</li>
                                    <li>• Track status &amp; timeline</li>
                                    <li>• Stay anonymous if needed</li>
                                    <li>• Get notified on every update</li>
                                </ul>
                                <Link
                                    to="/signup"
                                    className="btn btn-small btn-student"
                                >
                                    Join as Student
                                </Link>
                            </div>

                            {/* Admin */}
                            <div className="role-card role-admin">
                                <h3 className="role-title">
                                    For Admins
                                </h3>
                                <p className="role-tagline">
                                    Your operations cockpit.
                                </p>
                                <ul className="role-list">
                                    <li>• Central dashboard of grievances</li>
                                    <li>• Filter by department, type, status</li>
                                    <li>• Comment &amp; update status</li>
                                    <li>• Meet response SLAs</li>
                                </ul>
                                <Link
                                    to="/admin/login"
                                    className="btn btn-small btn-admin"
                                >
                                    Admin Login
                                </Link>
                            </div>

                            {/* SuperAdmin */}
                            <div className="role-card role-superadmin">
                                <h3 className="role-title">
                                    For SuperAdmins
                                </h3>
                                <p className="role-tagline">
                                    Governance &amp; policy insights.
                                </p>
                                <ul className="role-list">
                                    <li>• Approve / reject admin accounts</li>
                                    <li>• Configure departments &amp; types</li>
                                    <li>• See reports &amp; analytics</li>
                                    <li>• Improve campus climate</li>
                                </ul>
                                <Link
                                    to="/superadmin/login"
                                    className="btn btn-small btn-superadmin"
                                >
                                    SuperAdmin Login
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>

                {/* FAQ / CTA SECTION */}
                <section className="section section-faq">
                    <div className="container faq-grid">
                        {/* FAQ */}
                        <div className="faq-column">
                            <h2 className="section-title small-bottom">
                                Frequently asked questions
                            </h2>
                            <div className="faq-list">
                                <div className="faq-item">
                                    <p className="faq-question">
                                        Is this only for one college?
                                    </p>
                                    <p className="faq-answer">
                                        The platform is designed campus-agnostic. It can be
                                        configured for any institution with departments, admins,
                                        and student users.
                                    </p>
                                </div>
                                <div className="faq-item">
                                    <p className="faq-question">
                                        Can students file anonymous complaints?
                                    </p>
                                    <p className="faq-answer">
                                        Yes, students can choose to hide identity while still
                                        allowing admins to handle the issue seriously.
                                    </p>
                                </div>
                                <div className="faq-item">
                                    <p className="faq-question">
                                        How do admins access their dashboard?
                                    </p>
                                    <p className="faq-answer">
                                        Approved admins can log in via the Admin Login area and
                                        immediately access the grievance dashboard.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* CTA Card */}
                        <div className="cta-card">
                            <div>
                                <h2 className="cta-title">
                                    Ready to make your campus more transparent?
                                </h2>
                                <p className="cta-text">
                                    Start by signing up as a student to experience the flow,
                                    or log in as an admin / superadmin if your account is already created.
                                </p>
                            </div>

                            <div className="cta-actions">
                                <Link
                                    to="/signup"
                                    className="btn btn-primary"
                                >
                                    Student Signup
                                </Link>
                                <Link
                                    to="/admin/login"
                                    className="btn btn-outline-dark"
                                >
                                    Admin Login
                                </Link>
                                <Link
                                    to="/superadmin/login"
                                    className="btn btn-outline-dark"
                                >
                                    SuperAdmin Login
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <Footer />
        </div>
    );
}
