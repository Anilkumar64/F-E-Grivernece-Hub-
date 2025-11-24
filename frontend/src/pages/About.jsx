import React from "react";
import "./About.css"; // adjust path if needed

function About() {
    return (
        <div className="about-page">
            {/* HERO / INTRO SECTION */}
            <section className="about-hero">
                <div className="about-container">
                    <div className="about-hero-content">
                        <span className="about-pill">About E-Grievance Hub</span>
                        <h1 className="about-title">
                            Bringing clarity and accountability to campus grievances.
                        </h1>
                        <p className="about-subtitle">
                            E-Grievance Hub is a unified platform that connects students,
                            administrators, and superadmins so issues are tracked, not forgotten.
                            Every complaint has a voice, a status, and a clear path to resolution.
                        </p>
                    </div>

                    <div className="about-hero-card">
                        <h3 className="about-hero-card-title">Why we built this</h3>
                        <p className="about-hero-card-text">
                            Traditional grievance handling often relies on paper forms,
                            scattered emails, and informal follow-ups. That means delays,
                            confusion, and students feeling unheard.
                        </p>
                        <p className="about-hero-card-text">
                            E-Grievance Hub replaces that with a structured, transparent
                            workflow where every action is recorded and visible to the
                            right people.
                        </p>
                    </div>
                </div>
            </section>

            {/* MISSION / VISION SECTION */}
            <section className="about-section">
                <div className="about-container">
                    <div className="about-two-column">
                        <div>
                            <h2 className="about-section-title">Our mission</h2>
                            <p className="about-section-text">
                                Our mission is to help campuses move from informal,
                                invisible grievance processes to a culture of transparency,
                                trust, and timely resolution.
                            </p>
                            <p className="about-section-text">
                                We believe students should always know <b>where</b> their
                                complaint stands, and administrators should have the tools
                                to respond efficiently and fairly.
                            </p>
                        </div>

                        <div className="about-highlight-box">
                            <h3 className="about-highlight-title">What E-Grievance Hub enables</h3>
                            <ul className="about-list">
                                <li>Single place to submit, track, and manage grievances</li>
                                <li>Role-based access for students, admins, and superadmins</li>
                                <li>Clear status updates: Pending, In Progress, Resolved, Rejected</li>
                                <li>Timeline of every action taken on a complaint</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* WHO IS IT FOR SECTION */}
            <section className="about-section about-section-muted">
                <div className="about-container">
                    <h2 className="about-section-title center">Built for every campus role</h2>
                    <p className="about-section-text center about-section-intro">
                        E-Grievance Hub works best when all stakeholders use it together.
                    </p>

                    <div className="about-role-grid">
                        <div className="about-role-card about-role-student">
                            <h3 className="about-role-title">Students</h3>
                            <p className="about-role-text">
                                File grievances in minutes, attach details, and see status
                                updates without chasing anyone offline.
                            </p>
                            <ul className="about-role-list">
                                <li>Simple complaint submission</li>
                                <li>Track progress & timeline</li>
                                <li>Stay informed with updates</li>
                            </ul>
                        </div>

                        <div className="about-role-card about-role-admin">
                            <h3 className="about-role-title">Admins</h3>
                            <p className="about-role-text">
                                View all grievances in one dashboard, assign them to the
                                right department, and keep records clean.
                            </p>
                            <ul className="about-role-list">
                                <li>Central grievance dashboard</li>
                                <li>Status & priority management</li>
                                <li>Internal notes & timeline events</li>
                            </ul>
                        </div>

                        <div className="about-role-card about-role-superadmin">
                            <h3 className="about-role-title">SuperAdmins</h3>
                            <p className="about-role-text">
                                Oversee the entire system, manage admins, and ensure
                                policies are followed across departments.
                            </p>
                            <ul className="about-role-list">
                                <li>High-level reports & trends</li>
                                <li>Escalation controls</li>
                                <li>Configuration & governance</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* VALUES / PRINCIPLES SECTION */}
            <section className="about-section">
                <div className="about-container">
                    <h2 className="about-section-title center">Our core principles</h2>

                    <div className="about-values-grid">
                        <div className="about-value-card">
                            <h3 className="about-value-title">Transparency</h3>
                            <p className="about-value-text">
                                Every grievance has a clear status, an owner, and a traceable
                                history. Nothing is hidden in private inboxes.
                            </p>
                        </div>

                        <div className="about-value-card">
                            <h3 className="about-value-title">Accountability</h3>
                            <p className="about-value-text">
                                Departments and admins can be held responsible for timely
                                responses, with full visibility into their actions.
                            </p>
                        </div>

                        <div className="about-value-card">
                            <h3 className="about-value-title">Student-centric</h3>
                            <p className="about-value-text">
                                The experience is designed so students feel heard, respected,
                                and informed at every step.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* FINAL CTA SECTION */}
            <section className="about-section about-section-cta">
                <div className="about-container about-cta-inner">
                    <div>
                        <h2 className="about-cta-title">
                            Ready to bring structure to your campus grievance process?
                        </h2>
                        <p className="about-cta-text">
                            Start by creating admin and superadmin accounts, define your
                            departments, and invite your team. E-Grievance Hub will handle
                            the workflow—so you can focus on resolving issues.
                        </p>
                    </div>
                    <div className="about-cta-actions">
                        <a href="/signup" className="about-cta-btn-primary">
                            Get started as student
                        </a>
                        <a href="/admin/login" className="about-cta-btn-secondary">
                            Admin login
                        </a>
                    </div>
                </div>
            </section>
        </div>
    );
}

export default About;
