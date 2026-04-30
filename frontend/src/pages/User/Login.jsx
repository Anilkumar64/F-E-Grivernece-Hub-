import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../../api/axiosInstance";
import Navbar from "../../components/common/Navbar";
import "../../styles/UserStyles/UserLogin.css";

const Login = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await api.post("/users/login", { email, password });

            const token = res?.data?.token || res?.data?.accessToken;
            if (token) {
                localStorage.setItem("token", token);
                localStorage.setItem("accessToken", token);
            }

            if (res?.data?.user) {
                localStorage.setItem("user", JSON.stringify(res.data.user));
                localStorage.setItem("authUser", JSON.stringify(res.data.user));
            }

            navigate("/user/dashboard");
        } catch (error) {
            console.error("Login error: ", error);
            alert(
                error?.response?.data?.message ||
                "Login failed. Please check your credentials."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-wrapper">
            <Navbar />

            <div className="login-main">   {/* new FLEX container */}

                {/* LEFT SIDE */}
                <div className="login-left">
                    <h1 className="login-left-title">E-Grievance Hub</h1>
                    <p className="login-left-text">
                        A simple & transparent campus grievance system.
                    </p>

                    <p className="login-left-text">
                        A transparent and efficient grievance system built for modern campuses.
                    </p>

                    <ul className="feature-list">
                        <li><span className="check-icon">✔</span> Raise and track grievances easily</li>
                        <li><span className="check-icon">✔</span> Real-time updates from admins</li>
                        <li><span className="check-icon">✔</span> Instant notifications on status changes</li>
                        <li><span className="check-icon">✔</span> Secure & role-based access system</li>
                    </ul>

                    <p className="tagline">“Your voice matters — we make sure it’s heard.”</p>
                </div>

                {/* RIGHT SIDE */}
                <div className="login-container">
                    <div className="login-box">
                        <h2>Welcome Back 👋</h2>
                        <p className="subtitle">Sign in to continue</p>

                        <form onSubmit={handleLogin}>
                            <div className="input-group">
                                <label>Email Address</label>
                                <input type="email" placeholder="example@gmail.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required />
                            </div>

                            <div className="input-group">
                                <label>Password</label>
                                <input type="password" placeholder="Enter your password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required />
                            </div>

                            <button type="submit" className="btn-login" disabled={loading}>
                                {loading ? "Logging in..." : "Login"}
                            </button>
                        </form>

                        <div className="extra-links">
                            <Link to="/forgot-password">Forgot Password?</Link>
                        </div>

                        <p className="signup-text">
                            Don’t have an account? <Link to="/signup">Create one</Link>
                        </p>
                    </div>
                </div>

            </div> {/* END login-main */}
        </div>

    );
};

export default Login;
