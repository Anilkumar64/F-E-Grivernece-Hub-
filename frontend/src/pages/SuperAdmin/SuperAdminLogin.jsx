import React, { useContext, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import AuthContext from "../../context/AuthCore";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import BrandMark from "../../components/common/BrandMark";

export default function SuperAdminLogin() {
    const { loginSuperAdmin } = useContext(AuthContext);
    const navigate = useNavigate();
    const [form, setForm] = useState({ email: "", password: "" });

    const submit = async (e) => {
        e.preventDefault();
        try {
            await loginSuperAdmin(form);
            toast.success("Super admin login successful");
            navigate("/superadmin/dashboard");
        } catch (error) {
            toast.error(error?.response?.data?.message || "Super admin login failed");
        }
    };

    return (
        <main className="min-h-screen bg-gray-50">
            <div className="app-container flex min-h-screen items-center justify-center py-8">
                <Card className="w-full max-w-md space-y-6">
                    <div className="space-y-2 text-center">
                        <div className="mx-auto mb-2 flex w-fit items-center gap-2">
                            <BrandMark showName={false} />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Super Admin Login</h1>
                        <p className="text-sm text-gray-600">Control governance, analytics, and system-wide configuration.</p>
                    </div>
                    <form className="space-y-4" onSubmit={submit}>
                        <label className="grid gap-2 text-sm font-medium text-gray-700">
                            Email
                            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                        </label>
                        <label className="grid gap-2 text-sm font-medium text-gray-700">
                            Password
                            <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
                        </label>
                        <Button type="submit" className="w-full">Sign In</Button>
                    </form>
                    <Link className="text-sm font-medium text-indigo-600 transition-all duration-200 hover:text-indigo-500" to="/superadmin">
                        Back to SuperAdmin landing
                    </Link>
                </Card>
            </div>
        </main>
    );
}