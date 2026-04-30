import React, { useContext, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import AuthContext from "../../context/AuthCore";

export default function Login() {
    const { loginStudent } = useContext(AuthContext);
    const navigate = useNavigate();
    const [form, setForm] = useState({ email: "", password: "" });

    const submit = async (e) => {
        e.preventDefault();
        try {
            await loginStudent(form);
            toast.success("Welcome back");
            navigate("/dashboard");
        } catch (error) {
            toast.error(error?.response?.data?.message || "Student login failed");
        }
    };

    return (
        <main className="auth-page">
            <form className="auth-card" onSubmit={submit}>
                <h1>Student Login</h1>
                <label>Email<input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
                <label>Password<input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
                <button className="primary-btn">Sign In</button>
                <Link to="/signup">Create student account</Link>
            </form>
        </main>
    );
}
