import React from "react";
import UserLandingNavbar from "../../components/landing/UserLandingNavbar";
import UserLandingFooter from "../../components/landing/UserLandingFooter";

// import "./Styles/UserLandingPage.css";

export default function UserLandingPage() {
    return (
        <div className="ul-root">

            <UserLandingNavbar />

            {/* HERO SECTION */}
            <section className="ul-hero">
                <div className="ul-hero-left">
                    <h1 className="ul-hero-title">
                        A Smarter, Faster & Transparent
                        <span className="highlight"> Student Grievance System</span>
                    </h1>

                    <p className="ul-hero-sub">
                        Raise issues confidently, track progress in real-time,
                        and experience a modern, transparent resolution process.
                    </p>

                    <div className="ul-hero-actions">
                        <a className="ul-btn-primary" href="/user/login">File a Grievance</a>
                        <a className="ul-btn-outline" href="/track">Track Complaint</a>
                    </div>
                </div>

                <div className="ul-hero-right">
                    <img
                        className="ul-hero-img"
                        src="https://images.unsplash.com/photo-1600267165477-6d4a3bb89683"
                        alt="Students"
                    />
                </div>
            </section>

            {/* ABOUT SECTION */}
            <section id="about" className="ul-section">
                <h2 className="ul-section-title">What is E-Grievance Hub?</h2>
                <p className="ul-section-desc">
                    A unified platform built for colleges to streamline the grievance process—
                    helping students raise issues easily, enabling admins to respond properly,
                    and giving institutions total transparency.
                </p>
            </section>

            {/* FEATURES */}
            <section id="features" className="ul-section">
                <h2 className="ul-section-title">Key Features</h2>

                <div className="ul-feature-grid">
                    <div className="ul-feature-box">⚡ Easy Complaint Filing</div>
                    <div className="ul-feature-box">🔐 Anonymous Submission</div>
                    <div className="ul-feature-box">📍 Real-time Tracking</div>
                    <div className="ul-feature-box">💬 Admin Comments</div>
                    <div className="ul-feature-box">📊 SuperAdmin Overview</div>
                    <div className="ul-feature-box">📁 Attachments Supported</div>
                </div>
            </section>

            {/* HOW IT WORKS */}
            <section id="how" className="ul-section">
                <h2 className="ul-section-title">How It Works</h2>

                <div className="ul-steps">
                    <div className="ul-step">
                        <span className="num">1</span>
                        Student submits grievance
                    </div>
                    <div className="ul-step">
                        <span className="num">2</span>
                        Admin responds & updates timeline
                    </div>
                    <div className="ul-step">
                        <span className="num">3</span>
                        Student tracks live status
                    </div>
                </div>
            </section>

            <UserLandingFooter />
        </div>
    );
}
