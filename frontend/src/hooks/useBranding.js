import { useEffect, useState } from "react";
import api from "../api/axiosInstance";

const fallbackBranding = {
    universityName: "Kernel University",
    universityLogo: "",
};

let brandingCache = null;
let brandingPromise = null;

const normalizeBranding = (config = {}) => {
    if (!config?.isPublished) return fallbackBranding;
    return {
        universityName: (config.universityName || fallbackBranding.universityName).trim(),
        universityLogo: (config.universityLogo || "").trim(),
    };
};

const fetchBranding = async () => {
    if (brandingCache) return brandingCache;
    if (brandingPromise) return brandingPromise;

    brandingPromise = api
        .get("/landing-config", { skipAuthRefresh: true })
        .then((res) => {
            brandingCache = normalizeBranding(res?.data?.config);
            return brandingCache;
        })
        .catch(() => fallbackBranding)
        .finally(() => {
            brandingPromise = null;
        });

    return brandingPromise;
};

export const useBranding = () => {
    const [branding, setBranding] = useState(brandingCache || fallbackBranding);

    useEffect(() => {
        let active = true;
        fetchBranding().then((data) => {
            if (active) setBranding(data);
        });
        return () => {
            active = false;
        };
    }, []);

    return branding;
};

export const resolveBrandAsset = (pathOrUrl = "") => {
    if (!pathOrUrl) return "";
    if (pathOrUrl.startsWith("http")) return pathOrUrl;
    const apiOrigin = (import.meta.env.VITE_API_URL || "").trim();
    return `${apiOrigin}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
};
