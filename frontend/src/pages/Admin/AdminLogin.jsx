import React, { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import AuthContext from "../../context/AuthCore";

export default function AdminLogin() {
    const { loginAdmin } = useContext(AuthContext);
    const navigate = useNavigate();
    const [form, setForm] = useState({ email: "", password: "" });

    const submit = async (e) => {
        e.preventDefault();
        try {
            await loginAdmin(form);
            toast.success("Admin login successful");
            navigate("/admin/dashboard");
        } catch (error) {
            toast.error(error?.response?.data?.message || "Admin login failed");
        }
    };

    return (
        <main className="auth-page">
            <form className="auth-card" onSubmit={submit}>
                <h1>Department Admin Login</h1>
                <label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
                <label>Password<input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
                <button type="submit" className="primary-btn">Sign In</button>
            </form>
        </main>
    );
}