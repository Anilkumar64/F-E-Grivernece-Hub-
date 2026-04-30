import React, { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../../api/axiosInstance";
import Navbar from "../../components/common/Navbar";
import "../../styles/UserStyles/UserLogin.css";

export default function ResetPassword() {
    const [params] = useSearchParams();
    const initialEmail = useMemo(() => params.get("email") || "", [params]);
    const [form, setForm] = useState({
        email: initialEmail,
        otp: "",
        password: "",
        confirmPassword: "",
    });
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (form.password !== form.confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }

        setLoading(true);
        try {
            await api.post("/users/reset-password", {
                email: form.email,
                otp: form.otp,
                password: form.password,
            });
            toast.success("Password reset successfully");
            navigate("/login");
        } catch (err) {
            toast.error(err?.response?.data?.message || "Failed to reset password");
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
                        <h2>Enter Reset Code</h2>
                        <p className="subtitle">Use the code sent to your email.</p>
                        <form onSubmit={handleSubmit}>
                            <div className="input-group">
                                <label>Email Address</label>
                                <input name="email" type="email" value={form.email} onChange={handleChange} required />
                            </div>
                            <div className="input-group">
                                <label>Reset Code</label>
                                <input name="otp" value={form.otp} onChange={handleChange} required />
                            </div>
                            <div className="input-group">
                                <label>New Password</label>
                                <input name="password" type="password" value={form.password} onChange={handleChange} required />
                            </div>
                            <div className="input-group">
                                <label>Confirm Password</label>
                                <input name="confirmPassword" type="password" value={form.confirmPassword} onChange={handleChange} required />
                            </div>
                            <button type="submit" className="btn-login" disabled={loading}>
                                {loading ? "Resetting..." : "Reset Password"}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
