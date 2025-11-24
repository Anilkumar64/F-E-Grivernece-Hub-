import React, { useState } from "react";
import api from "../../api/axiosInstance";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import "../styles/AdminSignup.css";

function AdminSignup() {
    const navigate = useNavigate();
    const [form, setForm] = useState({
        name: "",
        email: "",
        staffId: "",
        department: "",
        password: "",
    });

    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSignup = async (e) => {
        e.preventDefault();

        if (!form.email.endsWith(".ac.in")) {
            toast.error("Please use your official college email (.ac.in)");
            return;
        }

        const data = new FormData();
        data.append("name", form.name.trim());
        data.append("email", form.email.trim());
        data.append("staffId", form.staffId.trim());
        data.append("department", form.department.trim());
        data.append("password", form.password);

        if (file) data.append("idCardFile", file);

        try {
            setLoading(true);
            await api.post("/admin/register", data);
            toast.success("Admin request submitted. Pending approval.");
            navigate("/admin/login");
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || "Signup failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="admin-signup-wrapper">

            {/* TOP HEADER */}
            <div className="admin-signup-header">
                <div className="ash-logo">EG</div>
                <h2 className="ash-title">E-Grievance Hub</h2>
            </div>

            {/* MAIN TWO-COLUMN LAYOUT */}
            <div className="admin-signup-container">

                {/* LEFT SECTION */}
                <div className="admin-signup-left">
                    <h1>Become a Campus Admin</h1>
                    <p>
                        Admin accounts require verification by SuperAdmin.
                        Register using your official college email and upload your ID card.
                    </p>

                    <ul className="admin-signup-points">
                        <li>✔ Approve and manage student grievances</li>
                        <li>✔ Assign issues to departments</li>
                        <li>✔ Track resolution workflow</li>
                        <li>✔ Maintain campus transparency</li>
                    </ul>

                    {/* <div className="admin-illustration">
                        <img src="/admin-signup-illustration.png" alt="Admin Signup" />
                    </div> */}
                </div>

                {/* RIGHT FORM */}
                <div className="admin-signup-right">
                    <form onSubmit={handleSignup} className="admin-signup-form">
                        <h1 className="admin-signup-title">Admin Signup</h1>

                        <input
                            className="admin-input"
                            name="name"
                            placeholder="Full Name"
                            value={form.name}
                            onChange={handleChange}
                            required
                        />

                        <input
                            className="admin-input"
                            name="email"
                            type="email"
                            placeholder="College Email (.ac.in)"
                            value={form.email}
                            onChange={handleChange}
                            required
                        />

                        <input
                            className="admin-input"
                            name="staffId"
                            placeholder="Staff ID"
                            value={form.staffId}
                            onChange={handleChange}
                            required
                        />

                        <input
                            className="admin-input"
                            name="department"
                            placeholder="Department"
                            value={form.department}
                            onChange={handleChange}
                            required
                        />

                        <input
                            className="admin-input"
                            name="password"
                            type="password"
                            placeholder="Password"
                            value={form.password}
                            onChange={handleChange}
                            required
                        />

                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => setFile(e.target.files[0])}
                            className="admin-input-file"
                        />

                        <button type="submit" className="admin-btn" disabled={loading}>
                            {loading ? "Submitting..." : "Submit"}
                        </button>
                    </form>
                </div>

            </div>
        </div>
    );
}

export default AdminSignup;
