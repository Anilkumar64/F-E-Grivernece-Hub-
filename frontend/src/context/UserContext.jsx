import React, {
    createContext,
    useContext,
    useEffect,
    useState,
} from "react";
import axiosInstance from "../api/axiosInstance";
import AuthContext from "./AuthCore";

const UserContext = createContext(null);

export const UserProvider = ({ children }) => {
    const { authUser, role, isAuthenticated, loading: authLoading } =
        useContext(AuthContext);

    const [profile, setProfile] = useState(null);
    const [profileLoading, setProfileLoading] = useState(false);
    const [profileError, setProfileError] = useState(null);

    // 🔹 Fetch profile from backend

    const fetchProfile = async () => {
        if (!isAuthenticated || !role) return;

        setProfileLoading(true);
        setProfileError(null);

        try {
            let endpoint = "/api/users/profile";

            // Admin & SuperAdmin can share same /api/admin/me
            if (role === "admin" || role === "superadmin") {
                endpoint = "/api/admin/me";
            }

            const res = await axiosInstance.get(endpoint);

            // Try to normalise different possible shapes
            const data =
                res.data.user ||
                res.data.admin ||
                res.data.profile ||
                res.data.data ||
                res.data;

            setProfile(data);
        } catch (err) {
            console.error("Failed to fetch profile:", err);
            setProfileError(err);
            // On 401 etc., profile will just be null and AuthContext / axiosInstance
            // will handle token issues / redirects.
        } finally {
            setProfileLoading(false);
        }
    };

    // 🔹 Auto-fetch when auth state becomes ready
    useEffect(() => {
        if (authLoading) return;           // wait until AuthContext is ready

        if (!isAuthenticated) {
            setProfile(null);
            setProfileError(null);
            return;
        }

        fetchProfile();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated, role, authLoading]);

    const value = {
        profile,
        setProfile,         // in case you update it locally after edit
        profileLoading,
        profileError,
        refreshProfile: fetchProfile,
    };

    return (
        <UserContext.Provider value={value}>{children}</UserContext.Provider>
    );
};

export default UserContext;
