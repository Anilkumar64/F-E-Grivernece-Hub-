import React from "react";
import Navbar from "../../components/common/Navbar";
import Footer from "../../components/common/Footer";
import "../../styles/UserStyles/UserAbout.css";

export default function About() {
    return (
        <>
            <Navbar />

            <div className="about-wrapper">
                <div className="about-container">
                    <h1 className="about-title">About E-Grievance Hub</h1>

                    <p>
                        E-Grievance Hub is a modern grievance management platform designed to
                        help students raise issues efficiently and transparently.
                    </p>

                    <p>
                        The platform connects students, administrators, and super administrators
                        through a seamless workflow that ensures accountability and quicker
                        resolutions.
                    </p>

                    <p>
                        Our goal is simple — to empower educational institutions with a digital
                        solution that brings clarity, trust, and efficiency into grievance
                        handling.
                    </p>

                    <p className="about-highlight">
                        “Making campuses more transparent, one grievance at a time.”
                    </p>
                </div>
            </div>

            <Footer />
        </>
    );
}
