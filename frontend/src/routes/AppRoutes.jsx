import React from "react";
import { Route, Routes } from "react-router-dom";
import LandingPage from "../pages/Landing/LandingPage";
import Login from "../pages/User/Login";
import Signup from "../pages/User/Signup";
import Dashboard from "../pages/User/Dashboard";
import CreateGrievance from "../pages/User/CreateGrievance";
import MyGrievances from "../pages/User/MyGrievances";
import TrackGrievance from "../pages/User/TrackGrievance";
import Profile from "../pages/User/Profile";
import AdminLogin from "../pages/Admin/AdminLogin";
import AdminSignup from "../pages/Admin/AdminSignup";
import AdminAbout from "../pages/Admin/AdminAbout";
import AdminDashboard from "../pages/Admin/AdminDashboard";
import AdminGrievances from "../pages/Admin/AdminGrievances";
import PendingGrievances from "../pages/Admin/PendingGrievances";
import AdminGrievanceDetails from "../pages/Admin/AdminGrievanceDetails";
import AdminProfile from "../pages/Admin/AdminProfile";
import AdminLandingPage from "../pages/Landing/AdminLandingPage";
import SuperAdminLogin from "../pages/SuperAdmin/SuperAdminLogin";
import SuperAdminDashboard from "../pages/SuperAdmin/SuperAdminDashboard";
import AllAdmins from "../pages/SuperAdmin/AllAdmins";
import ManageDepartments from "../pages/SuperAdmin/ManageDepartments";
import ComplaintTypes from "../pages/SuperAdmin/ComplaintTypes";
import SuperAdminReports from "../pages/SuperAdmin/SuperAdminReports";
import SuperAdminLandingPage from "../pages/Landing/SuperAdminLandingPage";
import LandingEditor from "../pages/SuperAdmin/LandingEditor";
import ProtectedRoute from "../components/protected/ProtectedRoute";
import AppLayout from "../components/common/AppLayout";
import NotificationsPage from "../pages/Shared/NotificationsPage";
import AuditLogs from "../pages/SuperAdmin/AuditLogs";

export default function AppRoutes() {
    return (
        <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/admin" element={<AdminLandingPage />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/signup" element={<AdminSignup />} />
            <Route path="/admin/AdminSignup" element={<AdminSignup />} />
            <Route path="/admin/about" element={<AdminAbout />} />
            <Route path="/superadmin" element={<SuperAdminLandingPage />} />
            <Route path="/superadmin/login" element={<SuperAdminLogin />} />

            <Route element={<ProtectedRoute allowedRoles={["student"]} />}>
                <Route element={<AppLayout role="student" />}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/submit-grievance" element={<CreateGrievance />} />
                    <Route path="/my-grievances" element={<MyGrievances />} />
                    <Route path="/grievance/:id" element={<TrackGrievance />} />
                    <Route path="/notifications" element={<NotificationsPage />} />
                    <Route path="/profile" element={<Profile />} />
                </Route>
            </Route>

            <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
                <Route element={<AppLayout role="admin" />}>
                    <Route path="/admin/dashboard" element={<AdminDashboard />} />
                    <Route path="/admin/grievances" element={<AdminGrievances />} />
                    <Route path="/admin/pending" element={<PendingGrievances />} />
                    <Route path="/admin/resolved" element={<AdminGrievances fixedStatus="Resolved" />} />
                    <Route path="/admin/escalated" element={<AdminGrievances fixedStatus="Escalated" />} />
                    <Route path="/admin/comments" element={<AdminGrievances />} />
                    <Route path="/admin/grievance/:id" element={<AdminGrievanceDetails />} />
                    <Route path="/admin/notifications" element={<NotificationsPage />} />
                    <Route path="/admin/profile" element={<AdminProfile />} />
                </Route>
            </Route>

            <Route element={<ProtectedRoute allowedRoles={["superadmin"]} />}>
                <Route element={<AppLayout role="superadmin" />}>
                    <Route path="/superadmin/dashboard" element={<SuperAdminDashboard />} />
                    <Route path="/superadmin/admins" element={<AllAdmins />} />
                    <Route path="/superadmin/departments" element={<ManageDepartments />} />
                    <Route path="/superadmin/categories" element={<ComplaintTypes />} />
                    <Route path="/superadmin/landing-editor" element={<LandingEditor />} />
                    <Route path="/superadmin/reports" element={<SuperAdminReports />} />
                    <Route path="/superadmin/audit-logs" element={<AuditLogs />} />
                    <Route path="/superadmin/notifications" element={<NotificationsPage />} />
                    <Route path="/superadmin/profile" element={<AdminProfile />} />
                    <Route path="/superadmin/grievance/:id" element={<AdminGrievanceDetails />} />
                </Route>
            </Route>
        </Routes>
    );
}
