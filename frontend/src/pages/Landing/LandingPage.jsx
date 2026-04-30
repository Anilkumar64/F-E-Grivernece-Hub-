import React from "react";
import { Link } from "react-router-dom";

export default function LandingPage() {
    return (
        <main className="landing">
            <nav className="public-nav"><strong>University E-Grievance</strong><div><a href="#home">Home</a><a href="#about">About</a><a href="#contact">Contact</a><Link className="secondary-btn" to="/login">Sign In</Link></div></nav>
            <section className="hero" id="home">
                <h1>University E-Grievance</h1>
                <p>Submit. Track. Resolve.</p>
                <div><Link className="primary-btn" to="/login">Student Login</Link><Link className="secondary-btn" to="/admin/login">Admin Login</Link></div>
            </section>
            <section className="features" id="about">
                {["Submit Grievance", "Track Status", "Get Resolved"].map((title) => <article key={title}><h2>{title}</h2><p>Clear workflows keep every case visible from intake to resolution.</p></article>)}
            </section>
            <footer id="contact">University E-Grievance · Home · About · Contact · {new Date().getFullYear()}</footer>
        </main>
    );
}
