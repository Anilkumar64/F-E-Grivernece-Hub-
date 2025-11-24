import React from "react";

export default function Loader({ size = 40, text = "Loading..." }) {
    return (
        <div className="flex flex-col justify-center items-center gap-3 py-10">
            <div
                className="animate-spin rounded-full border-4 border-blue-500 border-t-transparent"
                style={{ width: size, height: size }}
            ></div>

            {text && (
                <p className="text-gray-600 text-sm animate-pulse">
                    {text}
                </p>
            )}
        </div>
    );
}
