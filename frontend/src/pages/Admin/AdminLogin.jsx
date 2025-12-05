import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../api/axiosInstance";
import AdminNavbar from "../../components/landing/AdminLandingNavbar";
import "../../styles/AdminStyles/AdminLogin.css";

export default function AdminLogin() {
    const navigate = useNavigate();
    const [form, setForm] = useState({
        email: "",
        password: "",
    });
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setForm((prev) => ({
            ...prev,
            [e.target.name]: e.target.value,
        }));
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // axiosInstance baseURL already includes /api
            const res = await api.post("/admin/login", {
                email: form.email,
                password: form.password,
            });

            const accessToken = res?.data?.accessToken;
            const admin = res?.data?.admin;

            if (accessToken) {
                localStorage.setItem("accessToken", accessToken);
                // if the rest of your app reads "token", keep them in sync
                localStorage.setItem("token", accessToken);
            }

            if (admin) {
                localStorage.setItem("admin", JSON.stringify(admin));
            }

            toast.success("Admin login successful");
            navigate("/admin/dashboard");
        } catch (err) {
            console.error("Admin login error:", err);
            toast.error(
                err?.response?.data?.message ||
                "Admin login failed. Check your credentials."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="admin-login-page">
            {/* Top Bar */}
            <AdminNavbar />


            {/* Main Content */}
            <main className="admin-login-main">
                <div className="admin-login-card">
                    {/* LEFT: Info */}
                    <section className="admin-login-left">
                        <h2 className="admin-left-title">Welcome, Administrator</h2>
                        <p className="admin-left-text">
                            This console is where you coordinate how grievances move
                            through your campus – from first report to final resolution.
                        </p>

                        <div className="admin-left-block">
                            <h3 className="admin-left-heading">From this panel you can:</h3>
                            <ul className="admin-left-list">
                                <li>📂 See every grievance in one unified queue</li>
                                <li>📌 Assign cases to departments and responsible staff</li>
                                <li>📊 Update status, priority, and timeline in real time</li>
                                <li>🧾 Keep a clear audit trail of all admin actions</li>
                            </ul>
                        </div>

                        <p className="admin-left-note">
                            Use your official admin credentials. If you don’t recognize this
                            page, close the window and contact your system administrator.
                        </p>
                    </section>

                    {/* RIGHT: Login Form */}
                    <section className="admin-login-right">
                        <form onSubmit={handleLogin} className="admin-login-form">
                            <h1 className="admin-login-title">Admin Login</h1>
                            <p className="admin-login-subtitle">
                                Sign in to manage student grievances and monitor resolution
                                across your institution.
                            </p>

                            <label className="admin-label">
                                Email
                                <input
                                    name="email"
                                    type="email"
                                    placeholder="Enter your official email"
                                    value={form.email}
                                    onChange={handleChange}
                                    className="admin-input"
                                    required
                                />
                            </label>

                            <label className="admin-label">
                                Password
                                <input
                                    name="password"
                                    type="password"
                                    placeholder="Enter your password"
                                    value={form.password}
                                    onChange={handleChange}
                                    className="admin-input"
                                    required
                                />
                            </label>

                            <button
                                type="submit"
                                className="admin-login-button"
                                disabled={loading}
                            >
                                {loading ? "Logging in..." : "Login"}
                            </button>

                            <p className="admin-helper-text">
                                Trouble signing in? Reach out to the E-Grievance Hub
                                system owner or IT team.
                            </p>
                        </form>
                    </section>
                </div>
            </main>
        </div>
    );
}
