import React, { useState, useEffect } from "react";
import api from "../../api/axiosInstance";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

export default function SuperAdminLogin() {
    const navigate = useNavigate();
    const [form, setForm] = useState({
        email: "",
        password: "",
    });
    const [loading, setLoading] = useState(false);

    // If already logged in as superadmin, redirect to dashboard
    useEffect(() => {
        try {
            const existing = JSON.parse(localStorage.getItem("superadmin"));
            if (existing) {
                navigate("/superadmin/dashboard");
            }
        } catch {
            // ignore parse error
        }
    }, [navigate]);

    const handleChange = (e) => {
        setForm((prev) => ({
            ...prev,
            [e.target.name]: e.target.value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!form.email || !form.password) {
            toast.error("Enter email and password");
            return;
        }

        try {
            setLoading(true);

            // Reuse the same backend login as Admin
            const res = await api.post("/admin/login", form);

            const admin = res.data.admin || res.data.user;

            // Role check: only allow superadmin
            const role = admin?.role?.toLowerCase?.();
            if (!admin || role !== "superadmin") {
                toast.error("You are not authorized as Super Admin");
                return;
            }

            // Clear any old admin session to avoid conflicts
            localStorage.removeItem("admin");

            // Save tokens + superadmin object
            const token = res.data.accessToken;
            if (token) {
                localStorage.setItem("accessToken", token);
                localStorage.setItem("token", token);
            }
            localStorage.setItem("superadmin", JSON.stringify(admin));

            toast.success("Super Admin login successful");
            navigate("/superadmin/dashboard");
        } catch (err) {
            console.error(err);
            toast.error(
                err?.response?.data?.message || "Login failed"
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex justify-center items-center min-h-screen bg-slate-100">
            <form
                onSubmit={handleSubmit}
                className="w-96 bg-white border p-6 rounded-xl shadow"
            >
                <h1 className="text-2xl font-bold mb-4 text-center">
                    Super Admin Login
                </h1>

                <input
                    className="border p-2 w-full mb-3 rounded"
                    name="email"
                    type="email"
                    placeholder="Email"
                    value={form.email}
                    onChange={handleChange}
                    required
                />

                <input
                    className="border p-2 w-full mb-3 rounded"
                    name="password"
                    type="password"
                    placeholder="Password"
                    value={form.password}
                    onChange={handleChange}
                    required
                />

                <button
                    type="submit"
                    disabled={loading}
                    className="bg-slate-900 text-white w-full py-2 rounded mt-2 disabled:opacity-60"
                >
                    {loading ? "Logging in..." : "Login"}
                </button>
            </form>
        </div>
    );
}
