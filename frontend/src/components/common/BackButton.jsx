import React from "react";
import { useNavigate } from "react-router-dom";
export default function BackButton({ fallback = "/", label = "Back" }) {
    const navigate = useNavigate();

    const handleClick = () => {
        if (window.history.length > 1) {
            navigate(-1);
        } else {
            navigate(fallback);
        }
    };

    return (
        <button className="back-button" onClick={handleClick}>
            ← {label}
        </button>
    );
}
