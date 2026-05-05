import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../../api/axiosInstance";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";

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
        <div className="min-h-screen bg-gray-50">
            <div className="app-container flex min-h-screen items-center justify-center py-8">
                <Card className="w-full max-w-md space-y-6">
                    <div className="space-y-2 text-center">
                        <div className="mx-auto mb-2 flex w-fit items-center gap-2">
                            <span className="ku-logo">KU</span>
                        </div>
                        <h2 className="text-2xl font-bold tracking-tight text-gray-900">Enter Reset Code</h2>
                        <p className="text-sm text-gray-600">Use the code sent to your email.</p>
                    </div>
                    <form className="space-y-4" onSubmit={handleSubmit}>
                        <label className="grid gap-2 text-sm font-medium text-gray-700">
                            Email Address
                            <Input name="email" type="email" value={form.email} onChange={handleChange} required />
                        </label>
                        <label className="grid gap-2 text-sm font-medium text-gray-700">
                            Reset Code
                            <Input name="otp" value={form.otp} onChange={handleChange} required />
                        </label>
                        <label className="grid gap-2 text-sm font-medium text-gray-700">
                            New Password
                            <Input name="password" type="password" value={form.password} onChange={handleChange} required />
                        </label>
                        <label className="grid gap-2 text-sm font-medium text-gray-700">
                            Confirm Password
                            <Input name="confirmPassword" type="password" value={form.confirmPassword} onChange={handleChange} required />
                        </label>
                        <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? "Resetting..." : "Reset Password"}
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
