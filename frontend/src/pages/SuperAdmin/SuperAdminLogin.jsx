import React, { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import AuthContext from "../../context/AuthCore";

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
        <main className="auth-page">
            <form className="auth-card" onSubmit={submit}>
                <h1>Super Admin Login</h1>
                <label>Email<input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
                <label>Password<input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
                <button className="primary-btn">Sign In</button>
            </form>
        </main>
    );
}
