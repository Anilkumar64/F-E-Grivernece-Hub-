import React, { useState } from "react";
import toast from "react-hot-toast";
import api from "../../api/axiosInstance";

export default function StepUpModal({ open, onClose, onVerified }) {
    const [code, setCode] = useState("");
    const [sending, setSending] = useState(false);
    const [verifying, setVerifying] = useState(false);

    if (!open) return null;

    const requestCode = async () => {
        setSending(true);
        try {
            await api.post("/auth/step-up/request");
            toast.success("Verification code sent to your email");
        } catch (error) {
            toast.error(error?.response?.data?.message || "Unable to send code");
        } finally {
            setSending(false);
        }
    };

    const verifyCode = async (e) => {
        e.preventDefault();
        setVerifying(true);
        try {
            await api.post("/auth/step-up/verify", { code });
            toast.success("Step-up verification complete");
            setCode("");
            onVerified?.();
            onClose?.();
        } catch (error) {
            toast.error(error?.response?.data?.message || "Invalid verification code");
        } finally {
            setVerifying(false);
        }
    };

    return (
        <div className="modal-backdrop">
            <form className="modal" onSubmit={verifyCode}>
                <div className="page-heading">
                    <h2>Step-up Verification</h2>
                    <button type="button" className="ghost-btn" onClick={onClose}>Close</button>
                </div>
                <p className="muted">Request a verification code and enter it to continue sensitive actions.</p>
                <div className="split-actions">
                    <button type="button" className="secondary-btn" onClick={requestCode} disabled={sending}>
                        {sending ? "Sending..." : "Send Code"}
                    </button>
                </div>
                <label>Verification Code
                    <input
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder="Enter 6-digit code"
                        required
                    />
                </label>
                <div className="split-actions">
                    <button type="button" className="secondary-btn" onClick={onClose}>Cancel</button>
                    <button className="primary-btn" disabled={verifying}>
                        {verifying ? "Verifying..." : "Verify & Continue"}
                    </button>
                </div>
            </form>
        </div>
    );
}

