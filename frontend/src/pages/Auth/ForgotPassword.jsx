import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../../api/axiosInstance";
import Navbar from "../../components/common/Navbar";
import "../../styles/UserStyles/UserLogin.css";

export default function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post("/users/forgot-password", { email });
            toast.success("If the email exists, a reset code has been sent.");
            navigate(`/reset-password?email=${encodeURIComponent(email)}`);
        } catch (err) {
            toast.error(err?.response?.data?.message || "Failed to request reset code");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-wrapper">
            <Navbar />
            <div className="login-main">
                <div className="login-container">
                    <div className="login-box">
                        <h2>Reset Password</h2>
                        <p className="subtitle">Enter your email to receive a reset code.</p>
                        <form onSubmit={handleSubmit}>
                            <div className="input-group">
                                <label>Email Address</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                            <button type="submit" className="btn-login" disabled={loading}>
                                {loading ? "Sending..." : "Send Code"}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
