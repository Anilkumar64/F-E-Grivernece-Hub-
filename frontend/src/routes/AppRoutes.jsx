import React from "react";
import { Routes, Route } from "react-router-dom";

// ONLY LandingPage for now
import LandingPage from "../pages/Landing/LandingPage";
import Login from "../pages/Auth/Login";
import Signup from "../pages/Auth/Signup";
import AdminLogin from "../pages/Admin/AdminLogin";
import AdminDashboard from "../pages/Admin/AdminDashboard";
import AdminSignup from "../pages/Admin/AdminSignup";
import AdminGrievanceDetails from "../pages/Admin/AdminGrievanceDetails";
import AdminProfile from "../pages/Admin/AdminProfile";
import AdminGrievances from "../pages/Admin/AdminGrievances";
import ManageComplaintTypes from "../pages/Admin/ManageComplaintTypes";
import PendingGrievances from "../pages/Admin/PendingGrievances";
import About from "../pages/About";
import SuperAdminLayout from "../layouts/SuperAdminLayout";
import SuperAdminProtected from "../components/protected/SuperAdminProtected";
import SuperAdminLogin from "../pages/SuperAdmin/SuperAdminLogin";
import SuperAdminDashboard from "../pages/SuperAdmin/SuperAdminDashboard";
import SuperAdminReports from "../pages/SuperAdmin/SuperAdminReports";
import PendingAdmins from "../pages/SuperAdmin/PendingAdmins";
import ManageDepartments from "../pages/SuperAdmin/ManageDepartments";
import UserLayout from "../layouts/UserLayout";
import AdminLayout from "../layouts/AdminLayout";
import CreateGrievance from "../pages/User/CreateGrievance";
import TrackGrievance from "../pages/User/TrackGrievance";
import Dashboard from "../pages/User/Dashboard";
import MyGrievances from "../pages/User/MyGrievances";
import GrievanceDetails from "../pages/User/GrievanceDetails";
import ProtectedRoute from "../components/protected/ProtectedRoute";


export default function AppRoutes() {
    return (
        <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />


            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/AdminSignup" element={<AdminSignup />} />
            <Route path="/admin/grievance/:id" element={<AdminGrievanceDetails />} />
            <Route path="/admin/profile" element={<AdminProfile />} />
            <Route path="/admin/grievances" element={<AdminGrievances />} />
            <Route path="/admin/manage-types" element={<ManageComplaintTypes />} />
            <Route path="/admin/pending" element={<PendingGrievances />} />
            <Route path="/About" element={<About />} />


            <Route path="/superadmin/login" element={<SuperAdminLogin />} />

            {/* SUPERADMIN AREA WITH LAYOUT + OUTLET */}
            <Route path="/superadmin" element={<SuperAdminLayout />}>
                <Route index element={<SuperAdminDashboard />} />
                <Route path="dashboard" element={<SuperAdminDashboard />} />
                <Route path="pending-admins" element={<PendingAdmins />} />
                <Route path="reports" element={<SuperAdminReports />} />
                <Route path="manage-departments" element={<ManageDepartments />} />
            </Route>

            <Route path="/user/dashboard" element={<UserLayout><Dashboard /></UserLayout>} />
            <Route path="/user/create-grievance" element={<UserLayout><CreateGrievance /></UserLayout>} />
            <Route path="/user/track-grievance/:id" element={<UserLayout><TrackGrievance /></UserLayout>} />
            <Route path="/user/my-grievances" element={<UserLayout><MyGrievances /></UserLayout>} />
            <Route path="/user/grievance/:id" element={<UserLayout><GrievanceDetails /></UserLayout>} />





        </Routes >
    );
}
