import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "../../api/axiosInstance";
import "../styles/VerifyOtp.css";

const VerifyOtp = () => {
    const [otp, setOtp] = useState("");
    const [seconds, setSeconds] = useState(60);

    const [searchParams] = useSearchParams();
    const email = searchParams.get("email");

    const navigate = useNavigate();

    // Redirect back to signup if no email in query
    useEffect(() => {
        if (!email) {
            alert("Email not found. Please sign up again.");
            navigate("/signup");
        }
    }, [email, navigate]);

    // Countdown timer for Resend OTP
    useEffect(() => {
        if (seconds > 0) {
            const timer = setTimeout(() => setSeconds((prev) => prev - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [seconds]);

    // Handle OTP Submit
    const handleVerify = async (e) => {
        e.preventDefault();
        if (!email) return;

        try {
            // Backend: POST /api/users/verify-otp  (baseURL="/api")
            const res = await api.post("/users/verify-otp", { email, otp });
            console.log("Verify OTP response:", res.data);

            alert("OTP Verified Successfully!");
            navigate("/login");
        } catch (error) {
            console.error("Verify OTP error:", error);
            alert(
                error?.response?.data?.message ||
                "Invalid OTP. Please try again."
            );
        }
    };

    // Resend OTP
    const handleResend = async () => {
        if (!email) return;

        try {
            // You must have this route in backend, or this will be 404
            await api.post("/users/resend-otp", { email });
            alert("OTP resent successfully!");
            setSeconds(60);
        } catch (error) {
            console.error("Resend OTP error:", error);
            alert("Failed to resend OTP. Please try again later.");
        }
    };

    return (
        <div className="otp-container">
            <div className="otp-box">
                <h2>Email Verification</h2>
                <p>
                    OTP has been sent to: <strong>{email || "N/A"}</strong>
                </p>

                <form onSubmit={handleVerify}>
                    <div className="otp-input-group">
                        <label>Enter OTP</label>
                        <input
                            type="text"
                            maxLength="6"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            required
                        />
                    </div>

                    <button type="submit" className="btn-verify">
                        Verify OTP
                    </button>
                </form>

                <div className="resend-box">
                    {seconds > 0 ? (
                        <p>
                            Resend OTP in: <b>{seconds}</b> sec
                        </p>
                    ) : (
                        <button className="resend-btn" onClick={handleResend}>
                            Resend OTP
                        </button>
                    )}
                </div>

                <p className="back-login" onClick={() => navigate("/login")}>
                    Back to Login
                </p>
            </div>
        </div>
    );
};

export default VerifyOtp;
