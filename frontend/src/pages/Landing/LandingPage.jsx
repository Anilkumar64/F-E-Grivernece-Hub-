import React from "react";
import { Link } from "react-router-dom";
import Navbar from "../../components/common/Navbar";
import Footer from "../../components/common/Footer";
import "../../styles/UserStyles/UserLandingpage.css";

export default function LandingPage() {
    return (
        <div className="landing-page">
            <Navbar />

            <main className="landing-main">
                {/* HERO SECTION */}
                <section className="hero-section">
                    <div className="container hero-grid">

                        {/* LEFT TEXT */}
                        <div className="hero-content">
                            <span className="hero-pill">
                                🎓 Campus · 🛡 Transparency · ⚡ Fast Resolution
                            </span>

                            <h1 className="hero-title">
                                A smarter way to handle
                                <span className="hero-title-highlight"> student grievances</span>.
                            </h1>

                            <p className="hero-subtitle">
                                Raise your concern safely, track its progress in real-time,
                                and stay updated at every step.
                            </p>

                            <div className="hero-actions">
                                <Link to="/signup" className="btn btn-primary">
                                    Get Started
                                </Link>

                                <a href="#why" className="btn btn-outline">
                                    Browse features
                                </a>
                            </div>

                            <div className="hero-highlights">
                                <div className="hero-highlight-item">
                                    <span>✅ File complaints easily</span>
                                </div>
                                <div className="hero-highlight-item">
                                    <span>✅ Track progress & updates</span>
                                </div>
                                <div className="hero-highlight-item">
                                    <span>✅ Anonymous option available</span>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT ILLUSTRATION / MINI CARD */}
                        <div className="hero-card-wrapper">
                            <div className="hero-card-glow" />
                            <div className="hero-card">
                                <div className="hero-card-header">
                                    <div>
                                        <p className="hero-card-label">Student Dashboard</p>
                                        <p className="hero-card-title">Your Activity Snapshot</p>
                                    </div>
                                    <span className="status-badge">Active</span>
                                </div>

                                <div className="hero-stats-grid">
                                    <div className="stat-box stat-box-blue">
                                        <p className="stat-label">Your Complaints</p>
                                        <p className="stat-value">—</p>
                                    </div>
                                    <div className="stat-box stat-box-green">
                                        <p className="stat-label">Resolved</p>
                                        <p className="stat-value">—</p>
                                    </div>
                                    <div className="stat-box stat-box-amber">
                                        <p className="stat-label">In Progress</p>
                                        <p className="stat-value">—</p>
                                    </div>
                                </div>

                                <div className="hero-card-footer">
                                    <p className="hero-card-footer-hint">
                                        All updates appear in your student dashboard once you log in.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* WHY SECTION */}
                <section className="section section-why" id="why">
                    <div className="container">
                        <div className="section-header center">
                            <h2 className="section-title">Why use E-Grievance Hub?</h2>
                            <p className="section-subtitle">
                                A simple and transparent platform built to help students raise concerns confidently.
                            </p>
                        </div>

                        <div className="feature-grid">
                            <div className="feature-card">
                                <p className="feature-emoji">🎓</p>
                                <h3 className="feature-title">Easy for Students</h3>
                                <p className="feature-text">
                                    Simple forms, easy categories, and clean interface so you don’t get confused.
                                </p>
                            </div>

                            <div className="feature-card">
                                <p className="feature-emoji">⚡</p>
                                <h3 className="feature-title">Quick Resolution</h3>
                                <p className="feature-text">
                                    Track what's happening. Get notified. No need to run around departments.
                                </p>
                            </div>

                            <div className="feature-card">
                                <p className="feature-emoji">🔐</p>
                                <h3 className="feature-title">Stay Anonymous</h3>
                                <p className="feature-text">
                                    Want privacy? File grievances without revealing your identity.
                                </p>
                            </div>

                            <div className="feature-card">
                                <p className="feature-emoji">📨</p>
                                <h3 className="feature-title">Clear Communication</h3>
                                <p className="feature-text">
                                    Every update is recorded—no more “nobody told me”.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* HOW IT WORKS */}
                <section className="section section-how">
                    <div className="container">
                        <div className="section-header center">
                            <h2 className="section-title">How it works</h2>
                            <p className="section-subtitle">
                                Just 3 steps to raise and track your grievance.
                            </p>
                        </div>

                        <div className="steps-grid">
                            <div className="step-card">
                                <div className="step-number">1</div>
                                <h3 className="step-title">Submit your grievance</h3>
                                <p className="step-text">
                                    Choose department, type, priority, and explain your concern.
                                </p>
                            </div>

                            <div className="step-card">
                                <div className="step-number">2</div>
                                <h3 className="step-title">Track progress</h3>
                                <p className="step-text">
                                    Check updates, comments, and timeline from your dashboard.
                                </p>
                            </div>

                            <div className="step-card">
                                <div className="step-number">3</div>
                                <h3 className="step-title">Get resolution</h3>
                                <p className="step-text">
                                    You get notified when the issue is resolved or requires input.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* FAQ + CTA */}
                <section className="section section-faq" id="faq">
                    <div className="container faq-grid">
                        {/* FAQ */}
                        <div className="faq-column">
                            <h2 className="section-title small-bottom">FAQs</h2>

                            <div className="faq-list">
                                <div className="faq-item">
                                    <p className="faq-question">Is this platform only for students?</p>
                                    <p className="faq-answer">
                                        Yes. This landing page and experience are student-focused.
                                    </p>
                                </div>

                                <div className="faq-item">
                                    <p className="faq-question">Can I file anonymous grievances?</p>
                                    <p className="faq-answer">
                                        Absolutely. Your identity stays hidden if you choose anonymity.
                                    </p>
                                </div>

                                <div className="faq-item">
                                    <p className="faq-question">How do I check updates?</p>
                                    <p className="faq-answer">
                                        After submitting a grievance, login anytime to see progress.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* CTA CARD */}
                        <div className="cta-card">
                            <div>
                                <h2 className="cta-title">Raise your first grievance</h2>
                                <p className="cta-text">
                                    Create your student account and start using the grievance system today.
                                </p>
                            </div>

                            <div className="cta-actions">
                                <Link to="/signup" className="btn btn-primary">
                                    Create Account
                                </Link>

                                <Link to="/login" className="btn btn-outline-dark">
                                    Student Login
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
