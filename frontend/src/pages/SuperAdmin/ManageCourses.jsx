import React, { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../api/axiosInstance";
import Skeleton from "../../components/common/Skeleton";
import EmptyState from "../../components/common/EmptyState";
import Modal from "../../components/ui/Modal";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Card from "../../components/ui/Card";

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
        <section className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">Manage Courses</h1>
                    <p className="text-sm text-gray-600">Add or delete course options used by Signup and Profile forms.</p>
                </div>
                <Button onClick={() => setShowForm(true)}>
                    <Plus size={18} /> Add Course
                </Button>
            </div>

            {loading ? <Skeleton rows={4} /> : !courses.length ? (
                <EmptyState icon="🎓" title="No courses found" actionLabel="Add Course" onAction={() => setShowForm(true)} />
            ) : (
                <Card className="overflow-hidden p-0">
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
                                        <Button variant="outline" className="border-rose-200 text-rose-700 hover:bg-rose-50" onClick={() => removeCourse(course._id)}>
                                            <Trash2 size={14} /> Delete
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                </Card>
            )}

            <Modal open={showForm} onClose={() => setShowForm(false)}>
                    <form className="space-y-4" onSubmit={submit}>
                        <div className="flex items-center justify-between gap-3">
                            <h2 className="text-xl font-semibold tracking-tight text-gray-900">Add Course</h2>
                            <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Close</Button>
                        </div>
                        <label className="grid gap-2 text-sm font-medium text-gray-700">Course Name
                            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                        </label>
                        <div className="grid gap-3 md:grid-cols-2">
                            <label className="grid gap-2 text-sm font-medium text-gray-700">Code
                                <Input
                                    value={form.code}
                                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                                    required
                                />
                            </label>
                            <label className="grid gap-2 text-sm font-medium text-gray-700">Duration (years)
                                <Input
                                    type="number"
                                    min="1"
                                    max="8"
                                    value={form.durationYears}
                                    onChange={(e) => setForm({ ...form, durationYears: Number(e.target.value) })}
                                    required
                                />
                            </label>
                        </div>
                        <label className="grid gap-2 text-sm font-medium text-gray-700">Department (optional)
                            <select className="ui-input"
                                value={form.department}
                                onChange={(e) => setForm({ ...form, department: e.target.value })}
                            >
                                <option value="">All Departments</option>
                                {departments.map((dept) => (
                                    <option key={dept._id} value={dept._id}>{dept.name} ({dept.code})</option>
                                ))}
                            </select>
                        </label>
                        <div className="flex justify-end gap-3">
                            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                            <Button>Create Course</Button>
                        </div>
                    </form>
            </Modal>
        </section>
    );
}
