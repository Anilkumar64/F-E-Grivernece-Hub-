import React, { useEffect, useState } from "react";
import api from "../../api/axiosInstance";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4400";

export default function AuthenticatedImage({ src, alt, className }) {
    const [blobUrl, setBlobUrl] = useState("");

    useEffect(() => {
        if (!src) return undefined;

        let active = true;
        let createdUrl = "";
        const url = src.startsWith("http") ? src : `${BASE_URL}${src.startsWith("/") ? "" : "/"}${src}`;

        api.get(url, { responseType: "blob" })
            .then((res) => {
                if (!active) return;
                createdUrl = URL.createObjectURL(res.data);
                setBlobUrl(createdUrl);
            })
            .catch(() => {
                if (active) setBlobUrl("");
            });

        return () => {
            active = false;
            if (createdUrl) URL.revokeObjectURL(createdUrl);
        };
    }, [src]);

    if (!blobUrl) return null;
    return <img src={blobUrl} alt={alt} className={className} />;
}
