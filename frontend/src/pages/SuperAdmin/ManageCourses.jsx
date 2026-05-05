import React, { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../api/axiosInstance";
import Skeleton from "../../components/common/Skeleton";
import EmptyState from "../../components/common/EmptyState";

const initialForm = { name: "", code: "", durationYears: 4, department: "" };

export default function ManageCourses() {
    const [courses, setCourses] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(initialForm);

    const load = async () => {
        setLoading(true);
        try {
            const [courseRes, deptRes] = await Promise.all([
                api.get("/courses"),
                api.get("/departments"),
            ]);
            setCourses(courseRes.data?.courses || []);
            setDepartments(deptRes.data || []);
        } catch (error) {
            toast.error(error?.response?.data?.message || "Unable to load courses");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const submit = async (e) => {
        e.preventDefault();
        try {
            await api.post("/courses", {
                ...form,
                department: form.department || null,
            });
            toast.success("Course added");
            setForm(initialForm);
            setShowForm(false);
            load();
        } catch (error) {
            toast.error(error?.response?.data?.message || "Unable to add course");
        }
    };

    const removeCourse = async (id) => {
        if (!window.confirm("Delete this course?")) return;
        try {
            await api.delete(`/courses/${id}`);
            toast.success("Course deleted");
            load();
        } catch (error) {
            toast.error(error?.response?.data?.message || "Unable to delete course");
        }
    };

    return (
        <section className="page-section">
            <div className="page-heading">
                <div>
                    <h1>Manage Courses</h1>
                    <p>Add or delete course options used by Signup and Profile forms.</p>
                </div>
                <button className="primary-btn" onClick={() => setShowForm(true)}>
                    <Plus size={18} /> Add Course
                </button>
            </div>

            {loading ? <Skeleton rows={4} /> : !courses.length ? (
                <EmptyState icon="🎓" title="No courses found" actionLabel="Add Course" onAction={() => setShowForm(true)} />
            ) : (
                <div className="responsive-table">
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Code</th>
                                <th>Duration</th>
                                <th>Department</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {courses.map((course) => (
                                <tr key={course._id}>
                                    <td>{course.name}</td>
                                    <td>{course.code}</td>
                                    <td>{course.durationYears} years</td>
                                    <td>{course.department?.name || "All Departments"}</td>
                                    <td>
                                        <button className="danger-btn" onClick={() => removeCourse(course._id)}>
                                            <Trash2 size={14} /> Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {showForm && (
                <div className="modal-backdrop">
                    <form className="modal" onSubmit={submit}>
                        <div className="page-heading">
                            <h2>Add Course</h2>
                            <button type="button" className="ghost-btn" onClick={() => setShowForm(false)}>Close</button>
                        </div>
                        <label>Course Name
                            <input
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                required
                            />
                        </label>
                        <div className="form-grid">
                            <label>Code
                                <input
                                    value={form.code}
                                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                                    required
                                />
                            </label>
                            <label>Duration (years)
                                <input
                                    type="number"
                                    min="1"
                                    max="8"
                                    value={form.durationYears}
                                    onChange={(e) => setForm({ ...form, durationYears: Number(e.target.value) })}
                                    required
                                />
                            </label>
                        </div>
                        <label>Department (optional)
                            <select
                                value={form.department}
                                onChange={(e) => setForm({ ...form, department: e.target.value })}
                            >
                                <option value="">All Departments</option>
                                {departments.map((dept) => (
                                    <option key={dept._id} value={dept._id}>{dept.name} ({dept.code})</option>
                                ))}
                            </select>
                        </label>
                        <div className="split-actions">
                            <button type="button" className="secondary-btn" onClick={() => setShowForm(false)}>Cancel</button>
                            <button className="primary-btn">Create Course</button>
                        </div>
                    </form>
                </div>
            )}
        </section>
    );
}
