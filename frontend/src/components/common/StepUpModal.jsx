import React, { useState } from "react";
import toast from "react-hot-toast";
import api from "../../api/axiosInstance";
import Button from "../ui/Button";
import Input from "../ui/Input";
import Modal from "../ui/Modal";

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
        <Modal open={open} onClose={onClose}>
            <form className="space-y-4" onSubmit={verifyCode}>
                <div className="flex items-center justify-between gap-3">
                    <h2 className="text-xl font-semibold tracking-tight text-gray-900">Step-up Verification</h2>
                    <Button type="button" variant="ghost" onClick={onClose}>Close</Button>
                </div>
                <p className="text-sm text-gray-600">Request a verification code and enter it to continue sensitive actions.</p>
                <div className="flex">
                    <Button type="button" variant="outline" onClick={requestCode} disabled={sending}>
                        {sending ? "Sending..." : "Send Code"}
                    </Button>
                </div>
                <label className="grid gap-2 text-sm font-medium text-gray-700">Verification Code
                    <Input
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder="Enter 6-digit code"
                        required
                    />
                </label>
                <div className="flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                    <Button disabled={verifying}>
                        {verifying ? "Verifying..." : "Verify & Continue"}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}

