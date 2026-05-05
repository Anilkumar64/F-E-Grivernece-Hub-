import React from "react";
import { Link } from "react-router-dom";
import Footer from "../../components/landing/SuperAdminLandingFooter";
import SuperAdminNavbar from "../../components/landing/SuperAdminLandingNavbar";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";

export default function SuperAdminLandingPage() {
    return (
        <div className="min-h-screen bg-gray-50">
            <SuperAdminNavbar />
            <main className="app-container space-y-8 py-8">
                <section className="grid gap-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm lg:grid-cols-2 lg:p-8">
                    <div className="space-y-5">
                        <Badge>Governance · Analytics · Control</Badge>
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900 lg:text-4xl">
                            Lead your campus with full visibility.
                        </h1>
                        <p className="text-base leading-relaxed text-gray-600">
                            Manage admins, monitor grievance activity, configure departments and complaint types, and
                            enforce transparent operations.
                        </p>
                        <div className="grid gap-2 text-sm text-gray-600">
                            <p>Campus-wide analytics</p>
                            <p>Approve / reject admin accounts</p>
                            <p>Manage departments and categories</p>
                        </div>
                        <Button as={Link} to="/superadmin/login">SuperAdmin Login</Button>
                    </div>
                    <Card className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">SuperAdmin Panel</p>
                                <p className="text-lg font-semibold tracking-tight text-gray-900">Campus Control Center</p>
                            </div>
                            <Badge>Master Panel</Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <div className="rounded-xl bg-gray-50 p-3 text-center">
                                <p className="text-xs text-gray-500">Complaints</p>
                                <p className="text-sm font-semibold text-gray-900">Overview</p>
                            </div>
                            <div className="rounded-xl bg-gray-50 p-3 text-center">
                                <p className="text-xs text-gray-500">Admins</p>
                                <p className="text-sm font-semibold text-gray-900">Approval</p>
                            </div>
                            <div className="rounded-xl bg-gray-50 p-3 text-center">
                                <p className="text-xs text-gray-500">Resolution</p>
                                <p className="text-sm font-semibold text-gray-900">Campus-wide</p>
                            </div>
                        </div>
                        <p className="text-sm text-gray-600">Login to manage campus, admins, and grievance flow.</p>
                    </Card>
                </section>

                <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {[
                        ["Approve Admin Accounts", "Manage admin requests and decide dashboard access."],
                        ["Configure Departments", "Maintain structure, categories, and ownership clearly."],
                        ["Analytics Dashboard", "Track trends, response rates, and resolution velocity."],
                        ["High-level Control", "Audit activity and enforce operational policies."],
                    ].map(([title, text]) => (
                        <Card key={title} className="space-y-2">
                            <h3 className="text-base font-semibold tracking-tight text-gray-900">{title}</h3>
                            <p className="text-sm leading-relaxed text-gray-600">{text}</p>
                        </Card>
                    ))}
                </section>

                <Card className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
                    <div>
                        <h2 className="text-xl font-semibold tracking-tight text-gray-900">SuperAdmin Access</h2>
                        <p className="mt-1 text-sm text-gray-600">Login to manage your campus-level grievance system.</p>
                    </div>
                    <Button as={Link} to="/superadmin/login">SuperAdmin Login</Button>
                </Card>
            </main>
            <Footer />
        </div>
    );
}
