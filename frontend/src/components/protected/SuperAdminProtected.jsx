// SuperAdminProtected.jsx is no longer used.
// All role protection is handled by ProtectedRoute with allowedRoles={["superadmin"]}.
// This file is kept only to avoid breaking any stale import — it re-exports ProtectedRoute.
export { default } from "./ProtectedRoute";