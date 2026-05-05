// ✅ FIX M-09: removed imports for pages that do not exist in the frontend src tree.
//    The original file imported ApproveAdmins (no such file) and ManageComplaintTypes
//    (lives at pages/Admin/ but was also incorrectly imported for SuperAdmin use).
//    Each import that had no matching file has been removed or corrected.
//
// ✅ FIX MO-09: duplicate routes /admin/signup and /admin/AdminSignup both rendered
//    <AdminSignup />. Having two routes for the same component causes React Router to
//    match the first one and silently ignore the second, which is confusing and wastes
//    a route slot. Collapsed to a single canonical path /admin/signup.

import React from "react";
import { Route, Routes } from "react-router-dom";
import LandingPage from "../pages/Landing/LandingPage";
import Login from "../pages/User/Login";
import Signup from "../pages/User/Signup";
import ForgotPassword from "../pages/Auth/ForgotPassword";
import ResetPassword from "../pages/Auth/ResetPassword";
import Dashboard from "../pages/User/Dashboard";
import CreateGrievance from "../pages/User/CreateGrievance";
import MyGrievances from "../pages/User/MyGrievances";
import MyDrafts from "../pages/User/MyDrafts";
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
import PendingAdmins from "../pages/SuperAdmin/PendingAdmins";
import ManageDepartments from "../pages/SuperAdmin/ManageDepartments";
import ManageCourses from "../pages/SuperAdmin/ManageCourses";
import ComplaintTypes from "../pages/SuperAdmin/ComplaintTypes";
import SuperAdminReports from "../pages/SuperAdmin/SuperAdminReports";
import SuperAdminUsers from "../pages/SuperAdmin/SuperAdminUsers";
import SuperAdminSettings from "../pages/SuperAdmin/SuperAdminSettings";
import SuperAdminControlCenter from "../pages/SuperAdmin/SuperAdminControlCenter";
import SuperAdminLandingPage from "../pages/Landing/SuperAdminLandingPage";
import LandingEditor from "../pages/SuperAdmin/LandingEditor";
import AuditLogs from "../pages/SuperAdmin/AuditLogs";
import ProtectedRoute from "../components/protected/ProtectedRoute";
import PublicRoute from "../components/protected/PublicRoute";
import AppLayout from "../components/common/AppLayout";
import NotificationsPage from "../pages/Shared/NotificationsPage";

export default function AppRoutes() {
    return (
        <Routes>
            {/* ── Public ── */}
            <Route element={<PublicRoute />}>
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/admin" element={<AdminLandingPage />} />
                <Route path="/admin/login" element={<AdminLogin />} />
                {/* ✅ FIX MO-09: was two routes (/admin/signup AND /admin/AdminSignup) for
                    the same component. Keeping only the canonical lowercase path. */}
                <Route path="/admin/signup" element={<AdminSignup />} />
                <Route path="/admin/about" element={<AdminAbout />} />
                <Route path="/superadmin" element={<SuperAdminLandingPage />} />
                <Route path="/superadmin/login" element={<SuperAdminLogin />} />
            </Route>

            {/* ── Student ── */}
            <Route element={<ProtectedRoute allowedRoles={["student"]} />}>
                <Route element={<AppLayout role="student" />}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/submit-grievance" element={<CreateGrievance />} />
                    <Route path="/my-drafts" element={<MyDrafts />} />
                    <Route path="/my-grievances" element={<MyGrievances />} />
                    {/* ✅ FIX MI-13 (sidebar): route kept at /grievance/:id; sidebar
                        Track Grievance link fixed separately in UserSidebar.jsx */}
                    <Route path="/grievance/:id" element={<TrackGrievance />} />
                    <Route path="/track-grievance" element={<TrackGrievance />} />
                    <Route path="/notifications" element={<NotificationsPage />} />
                    <Route path="/profile" element={<Profile />} />
                </Route>
            </Route>

            {/* ── Admin ── */}
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

            {/* ── SuperAdmin ── */}
            <Route element={<ProtectedRoute allowedRoles={["superadmin"]} />}>
                <Route element={<AppLayout role="superadmin" />}>
                    <Route path="/superadmin/dashboard" element={<SuperAdminDashboard />} />
                    <Route path="/superadmin/admins" element={<AllAdmins />} />
                    <Route path="/superadmin/pending-admins" element={<PendingAdmins />} />
                    <Route path="/superadmin/departments" element={<ManageDepartments />} />
                    <Route path="/superadmin/courses" element={<ManageCourses />} />
                    <Route path="/superadmin/categories" element={<ComplaintTypes />} />
                    <Route path="/superadmin/landing-editor" element={<LandingEditor />} />
                    <Route path="/superadmin/reports" element={<SuperAdminReports />} />
                    <Route path="/superadmin/users" element={<SuperAdminUsers />} />
                    <Route path="/superadmin/settings" element={<SuperAdminSettings />} />
                    <Route path="/superadmin/control-center" element={<SuperAdminControlCenter />} />
                    <Route path="/superadmin/audit-logs" element={<AuditLogs />} />
                    <Route path="/superadmin/notifications" element={<NotificationsPage />} />
                    <Route path="/superadmin/profile" element={<AdminProfile />} />
                    <Route path="/superadmin/grievance/:id" element={<AdminGrievanceDetails />} />
                </Route>
            </Route>
        </Routes>
    );
}