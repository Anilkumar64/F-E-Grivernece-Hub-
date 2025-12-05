import React from "react";
import { Routes, Route } from "react-router-dom";

import LandingPage from "../pages/Landing/LandingPage";
import About from "../pages/About/About";

// USER pages
import Signup from "../pages/User/Signup";
import Login from "../pages/User/Login";
import Dashboard from "../pages/User/Dashboard";
import CreateGrievance from "../pages/User/CreateGrievance";
import GrievanceDetails from "../pages/User/GrievanceDetails";
import TrackGrievance from "../pages/User/TrackGrievance";
import MyGrievances from "../pages/User/MyGrievances";
import UserLayout from "../layouts/UserLayout";

// ADMIN pages
import AdminLogin from "../pages/Admin/AdminLogin";
import AdminDashboard from "../pages/Admin/AdminDashboard";
import AdminSignup from "../pages/Admin/AdminSignup";
import AdminGrievanceDetails from "../pages/Admin/AdminGrievanceDetails";
import AdminProfile from "../pages/Admin/AdminProfile";
import AdminGrievances from "../pages/Admin/AdminGrievances";
import ManageComplaintTypes from "../pages/Admin/ManageComplaintTypes";
import PendingGrievances from "../pages/Admin/PendingGrievances";
import AdminAbout from "../pages/Admin/AdminAbout";
import AdminLayout from "../layouts/AdminLayout";

// SUPER ADMIN pages
import ProtectedRoute from "../components/protected/ProtectedRoute";
import ApproveAdmins from "../pages/SuperAdmin/ApproveAdmins";
import SuperAdminLogin from "../pages/SuperAdmin/SuperAdminLogin";
import SuperAdminDashboard from "../pages/SuperAdmin/SuperAdminDashboard";
import SuperAdminReports from "../pages/SuperAdmin/SuperAdminReports";
import AllAdmins from "../pages/SuperAdmin/AllAdmins";
import ComplaintTypes from "../pages/SuperAdmin/ComplaintTypes";
import ManageDepartments from "../pages/SuperAdmin/ManageDepartments";
import PendingAdmins from "../pages/SuperAdmin/PendingAdmins";
import SuperAdminLayout from "../layouts/SuperAdminLayout";

// LANDING PAGES
// import UserLandingPage from "../pages/Landing/UserLandingPage";
import AdminLandingPage from "../pages/Landing/AdminLandingPage";
import SuperAdminLandingPage from "../pages/Landing/SuperAdminLandingPage";

export default function AppRoutes() {
    return (
        <Routes>
            {/* PUBLIC ROUTES */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/about" element={<About />} />

            {/* USER PUBLIC */}
            <Route path="/signup" element={<Signup />} />
            <Route path="/login" element={<Login />} />

            {/* USER PROTECTED ROUTES */}
            <Route element={<ProtectedRoute allowedRoles={["user"]} />}>
                <Route element={<UserLayout />}>
                    <Route path="/user/dashboard" element={<Dashboard />} />
                    <Route path="/user/create-grievance" element={<CreateGrievance />} />
                    <Route path="/user/grievance-details/:id" element={<GrievanceDetails />} />
                    <Route path="/user/track/:id" element={<TrackGrievance />} />
                    <Route path="/user/my-grievances" element={<MyGrievances />} />
                    <Route path="/user/grievance/:id" element={<GrievanceDetails />} />
                </Route>
            </Route>


            <Route path="/admin" element={<AdminLandingPage />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/AdminSignup" element={<AdminSignup />} />
            <Route path="/admin/about" element={<AdminAbout />} />

            <Route element={<ProtectedRoute allowedRoles={["admin", "departmentadmin"]} />}>
                <Route path="/admin" element={<AdminLayout />}>
                    <Route path="dashboard" element={<AdminDashboard />} />
                    <Route path="grievances" element={<AdminGrievances />} />
                    <Route path="pending" element={<PendingGrievances />} />
                    <Route path="grievance/:id" element={<AdminGrievanceDetails />} />
                    <Route path="manage-types" element={<ManageComplaintTypes />} />
                    <Route path="profile" element={<AdminProfile />} />
                </Route>
            </Route>




            {/* SUPERADMIN PUBLIC */}

            <Route path="/superadmin" element={<SuperAdminLandingPage />} />
            <Route path="/superadmin/login" element={<SuperAdminLogin />} />

            {/* SUPERADMIN PROTECTED */}
            <Route element={<ProtectedRoute allowedRoles={["superadmin"]} />}>
                <Route path="/superadmin" element={<SuperAdminLayout />}>

                    <Route path="dashboard" element={<SuperAdminDashboard />} />
                    <Route path="approve-admins" element={<ApproveAdmins />} />
                    <Route path="reports" element={<SuperAdminReports />} />
                    <Route path="all-admins" element={<AllAdmins />} />
                    <Route path="complaint-types" element={<ComplaintTypes />} />
                    <Route path="manage-departments" element={<ManageDepartments />} />
                    <Route path="pending-admins" element={<PendingAdmins />} />

                </Route>
            </Route>


            {/* <Route path="/" element={<UserLandingPage />} /> */}
            {/* <Route path="/admin" element={<AdminLandingPage />} /> */}

        </Routes >
    );
}
