import React from "react";
import { Link } from "react-router-dom";
import Navbar from "../../components/landing/AdminLandingNavbar";
import Footer from "../../components/landing/AdminLandingFooter";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";

export default function AdminLandingPage() {
    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />
            <main className="app-container space-y-8 py-8">
                <section className="grid gap-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm lg:grid-cols-2 lg:p-8">
                    <div className="space-y-5">
                        <Badge>Secure Admin Workspace</Badge>
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900 lg:text-4xl">
                            Manage departmental grievances quickly and clearly.
                        </h1>
                        <p className="text-base leading-relaxed text-gray-600">
                            Everything you need for handling assigned cases: review evidence, post updates, and
                            resolve complaints on time.
                        </p>
                        <div className="flex flex-wrap gap-3">
                            <Button as={Link} to="/admin/login">Admin Login</Button>
                            <Button as={Link} to="/admin/about" variant="outline">Learn More</Button>
                        </div>
                        <div className="grid gap-2 text-sm text-gray-600">
                            <p>Assigned queue by department</p>
                            <p>Priority and SLA visibility</p>
                            <p>Comment and timeline audit trail</p>
                        </div>
                    </div>
                    <Card className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Workflow Snapshot</p>
                                <p className="text-lg font-semibold tracking-tight text-gray-900">What happens after login</p>
                            </div>
                            <Badge>Admin Panel</Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <div className="rounded-xl bg-gray-50 p-3 text-center">
                                <p className="text-xs text-gray-500">Review</p>
                                <p className="text-sm font-semibold text-gray-900">Open</p>
                            </div>
                            <div className="rounded-xl bg-gray-50 p-3 text-center">
                                <p className="text-xs text-gray-500">Update</p>
                                <p className="text-sm font-semibold text-gray-900">Track</p>
                            </div>
                            <div className="rounded-xl bg-gray-50 p-3 text-center">
                                <p className="text-xs text-gray-500">Close</p>
                                <p className="text-sm font-semibold text-gray-900">Resolve</p>
                            </div>
                        </div>
                        <p className="text-sm text-gray-600">Access is provided by SuperAdmin only. No public admin signup.</p>
                    </Card>
                </section>

                <section className="grid gap-4 md:grid-cols-3">
                    {[
                        ["Department Queue", "See only the grievances relevant to your team."],
                        ["Timeline Updates", "Post status changes and maintain clear progress history."],
                        ["Collaborative Comments", "Communicate updates to students in one structured thread."],
                    ].map(([title, text]) => (
                        <Card key={title} className="space-y-2">
                            <h3 className="text-base font-semibold tracking-tight text-gray-900">{title}</h3>
                            <p className="text-sm leading-relaxed text-gray-600">{text}</p>
                        </Card>
                    ))}
                </section>

                <Card className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
                    <div>
                        <h2 className="text-xl font-semibold tracking-tight text-gray-900">Access the Admin Panel</h2>
                        <p className="mt-1 text-sm text-gray-600">Use your assigned admin credentials to manage department grievances.</p>
                    </div>
                    <div className="flex gap-3">
                        <Button as={Link} to="/admin/login">Admin Login</Button>
                        <Button as={Link} to="/admin/about" variant="outline">About Admin Panel</Button>
                    </div>
                </Card>
            </main>
            <Footer />
        </div>
    );
}
