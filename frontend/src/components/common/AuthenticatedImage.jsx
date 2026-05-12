import React, { useEffect, useState } from "react";
import api from "../../api/axiosInstance";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const PLACEHOLDER =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='120' viewBox='0 0 160 120'%3E%3Crect width='160' height='120' fill='%23f3f4f6'/%3E%3Cpath d='M50 78l20-22 16 16 12-12 22 26H42z' fill='%23d1d5db'/%3E%3Ccircle cx='58' cy='42' r='10' fill='%23d1d5db'/%3E%3C/svg%3E";

export default function AuthenticatedImage({ src, alt, className }) {
    const [blobUrl, setBlobUrl] = useState(PLACEHOLDER);

    useEffect(() => {
        if (!src) return undefined;

        let active = true;
        let createdUrl = "";
        const url = src.startsWith("http") ? src : `${BASE_URL}${src.startsWith("/") ? "" : "/"}${src}`;

        const load = async () => {
            try {
                const res = await api.get(url, { responseType: "blob" });
                if (!active) return;
                createdUrl = URL.createObjectURL(res.data);
                setBlobUrl(createdUrl);
            } catch {
                if (active) setBlobUrl(PLACEHOLDER);
            }
        };

        load();

        return () => {
            active = false;
            if (createdUrl) URL.revokeObjectURL(createdUrl);
        };
    }, [src]);

    return <img src={blobUrl} alt={alt} className={className} />;
}
