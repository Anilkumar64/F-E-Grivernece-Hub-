import { useEffect, useRef, useContext } from "react";
import { useLocation } from "react-router-dom";
import AuthContext from "../../context/AuthCore";
import api from "../../api/axiosInstance";

export default function RouteTracker() {
    const { authUser } = useContext(AuthContext);
    const location = useLocation();
    const prevPath = useRef(null);

    useEffect(() => {
        if (!authUser) return;
        const path = location.pathname;
        if (path === prevPath.current) return;
        prevPath.current = path;
        api.post("/audit-logs/activity", { path }).catch(() => {});
    }, [location.pathname, authUser]);

    return null;
}
