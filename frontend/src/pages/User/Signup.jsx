import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axiosInstance";
import Navbar from "../../components/common/Navbar";
import "../../styles/UserStyles/UserSignup.css";

const Signup = () => {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
        studentId: "",
        department: "",
        phone: "",
        yearOfStudy: "",
    });

    const [loading, setLoading] = useState(false);

    // Handle input changes
    const handleChange = (e) => {
        setForm({
            ...form,
            [e.target.name]: e.target.value,
        });
    };

    // Handle Form Submit
    const handleSignup = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (form.password !== form.confirmPassword) {
                alert("Passwords do not match");
                setLoading(false);
                return;
            }

            const body = {
                name: form.name,
                email: form.email,
                password: form.password,
                studentId: form.studentId,
                department: form.department,
                phone: form.phone,
                yearOfStudy: form.yearOfStudy,
            };

            await api.post("/users/register", body);

            alert("Account created successfully!");
            navigate("/login");

        } catch (error) {
            console.error("Signup error:", error);
            alert(error?.response?.data?.message || "Signup failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="signup-wrapper">
            <Navbar />

            <div className="signup-main">

                {/* LEFT SIDE IMAGE */}
                <div className="signup-left">
                    <img
                        src="/src/pages/User/image.png"
                        alt="signup illustration"
                        className="signup-illustration"
                    />
                </div>

                {/* RIGHT SIDE FORM */}
                <form className="signup-box" onSubmit={handleSignup}>
                    <h2>Create Account</h2>

                    <div className="input-group">
                        <label>Name</label>
                        <input
                            name="name"
                            value={form.name}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="input-group">
                        <label>Email</label>
                        <input
                            type="email"
                            name="email"
                            value={form.email}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="input-group">
                        <label>Password</label>
                        <input
                            type="password"
                            name="password"
                            value={form.password}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="input-group">
                        <label>Confirm Password</label>
                        <input
                            type="password"
                            name="confirmPassword"
                            value={form.confirmPassword}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="input-group">
                        <label>Student ID</label>
                        <input
                            name="studentId"
                            value={form.studentId}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="input-group">
                        <label>Phone</label>
                        <input
                            name="phone"
                            value={form.phone}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="input-group">
                        <label>Year of Study</label>
                        <input
                            name="yearOfStudy"
                            value={form.yearOfStudy}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="input-group">
                        <label>Department</label>
                        <select
                            name="department"
                            value={form.department}
                            onChange={handleChange}
                            required
                        >
                            <option value="">Select Department</option>
                            <option value="IT">Information Technology</option>
                            <option value="CSE">Computer Science</option>
                            <option value="ECE">Electronics</option>
                            <option value="EEE">Electrical</option>
                            <option value="MECH">Mechanical</option>
                            <option value="CIVIL">Civil</option>
                        </select>
                    </div>

                    <button className="btn-submit" type="submit" disabled={loading}>
                        {loading ? "Signing up..." : "Signup"}
                    </button>

                    <p className="have-account">
                        Already have an account?{" "}
                        <span onClick={() => navigate("/login")}>Login</span>
                    </p>
                </form>
            </div>
        </div>
    );
};

export default Signup;
