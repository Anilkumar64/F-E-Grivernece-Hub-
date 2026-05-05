import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../../api/axiosInstance";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";

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
        <div className="min-h-screen bg-gray-50">
            <div className="app-container flex min-h-screen items-center justify-center py-8">
                <Card className="w-full max-w-md space-y-6">
                    <div className="space-y-2 text-center">
                        <div className="mx-auto mb-2 flex w-fit items-center gap-2">
                            <span className="ku-logo">KU</span>
                        </div>
                        <h2 className="text-2xl font-bold tracking-tight text-gray-900">Reset Password</h2>
                        <p className="text-sm text-gray-600">Enter your email to receive a reset code.</p>
                    </div>
                    <form className="space-y-4" onSubmit={handleSubmit}>
                        <label className="grid gap-2 text-sm font-medium text-gray-700">
                            Email Address
                            <Input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                        </label>
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? "Sending..." : "Send Code"}
                        </Button>
                    </form>
                    <Link className="text-sm font-medium text-indigo-600 transition-all duration-200 hover:text-indigo-500" to="/login">
                        Back to login
                    </Link>
                </Card>
            </div>
        </div>
    );
}
