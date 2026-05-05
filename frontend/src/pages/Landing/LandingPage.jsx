import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, CheckCircle2, FileText, Search, Send } from "lucide-react";
import api from "../../api/axiosInstance";

const iconMap = { Send, Search, CheckCircle: CheckCircle2, CheckCircle2, FileText, Bell };

const fallback = {
    universityName: "University E-Grievance",
    heroTitle: "Submit. Track. Resolve.",
    heroSubtitle: "A transparent grievance platform for students and campus administrators.",
    features: [
        { icon: "Send", title: "Submit Grievances", description: "Raise issues with evidence in minutes." },
        { icon: "Search", title: "Track Progress", description: "Follow every status update and admin response." },
        { icon: "CheckCircle2", title: "Get Resolution", description: "Stay notified until your concern is resolved." },
    ],
    announcements: [],
    aboutText: "We help students raise concerns clearly and help teams resolve them responsibly.",
    contactEmail: "support@university.ac.in",
    contactPhone: "",
    isPublished: true,
};

export default function LandingPage() {
    const [config, setConfig] = useState(fallback);
    const [slideIndex, setSlideIndex] = useState(0);

    useEffect(() => {
        api.get("/landing-config", { skipAuthRefresh: true })
            .then((res) => {
                const incoming = res.data.config;
                setConfig(incoming?.isPublished ? incoming : fallback);
            })
            .catch(() => setConfig(fallback));
    }, []);

    const activeAnnouncements = (config.announcements || []).filter((item) => item.isActive);
    const heroStyle = config.heroImage ? { backgroundImage: `linear-gradient(90deg, rgba(255,255,255,.94), rgba(239,246,255,.86)), url(${config.heroImage})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined;
    const sliderImages = (config.sliderImages || []).filter(Boolean);

    useEffect(() => {
        if (sliderImages.length <= 1) return undefined;
        const timer = setInterval(() => {
            setSlideIndex((prev) => (prev + 1) % sliderImages.length);
        }, 3500);
        return () => clearInterval(timer);
    }, [sliderImages.length]);

    return (
        <main className="landing">
            <nav className="public-nav">
                <strong>{config.universityName}</strong>
                <div>
                    <a href="#home">Home</a>
                    <a href="#about">About</a>
                    <a href="#contact">Contact Us</a>
                    <Link className="secondary-btn" to="/login">User Login</Link>
                    <Link className="primary-btn" to="/signup">User Signup</Link>
                </div>
            </nav>
            <section className="hero" id="home" style={heroStyle}>
                {activeAnnouncements.length > 0 && <span className="pill">{activeAnnouncements[0].title}</span>}
                <h1>{config.heroTitle}</h1>
                <p>{config.heroSubtitle}</p>
                <div>
                    <Link className="primary-btn" to="/login">Student Login</Link>
                    <Link className="secondary-btn" to="/signup">Create Student Account</Link>
                </div>
            </section>
            {sliderImages.length > 0 && (
                <section className="landing-section" aria-label="Campus highlights">
                    <div className="landing-slider">
                        <img src={sliderImages[slideIndex % sliderImages.length]} alt={`Campus slide ${slideIndex + 1}`} />
                        <div className="landing-slider-dots">
                            {sliderImages.map((_, idx) => (
                                <button
                                    key={`dot-${idx}`}
                                    type="button"
                                    className={idx === (slideIndex % sliderImages.length) ? "active" : ""}
                                    aria-label={`Go to slide ${idx + 1}`}
                                    onClick={() => setSlideIndex(idx)}
                                />
                            ))}
                        </div>
                    </div>
                </section>
            )}
            <section className="features" id="about">
                {(config.features || fallback.features).slice(0, 6).map((feature) => {
                    const Icon = iconMap[feature.icon] || FileText;
                    return (
                        <article key={`${feature.title}-${feature.icon}`}>
                            <Icon size={28} color="#2563EB" />
                            <h2>{feature.title}</h2>
                            <p>{feature.description}</p>
                        </article>
                    );
                })}
            </section>
            {activeAnnouncements.length > 0 && (
                <section className="landing-section card-grid">
                    {activeAnnouncements.map((item) => (
                        <article className="announcement-card" key={item._id || item.title}>
                            <h2>{item.title}</h2>
                            <p>{item.body}</p>
                        </article>
                    ))}
                </section>
            )}
            <section className="landing-section" id="contact">
                <div className="card">
                    <h2>About</h2>
                    <p>{config.aboutText}</p>
                    <p className="muted">{config.contactEmail}{config.contactPhone ? ` · ${config.contactPhone}` : ""}</p>
                </div>
            </section>
            <footer>{config.universityName} · Home · About · Contact · {new Date().getFullYear()}</footer>
        </main>
    );
}
