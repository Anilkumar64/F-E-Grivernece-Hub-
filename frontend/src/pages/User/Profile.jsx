import React, { useContext } from "react";
import AuthContext from "../../context/AuthCore";

export default function Profile() {
    const { authUser } = useContext(AuthContext);
    return (
        <section className="page-section">
            <div className="page-heading"><h1>Profile</h1></div>
            <div className="info-panel">
                <p><strong>Name:</strong> {authUser?.name}</p>
                <p><strong>Email:</strong> {authUser?.email}</p>
                <p><strong>Student ID:</strong> {authUser?.studentId}</p>
                <p><strong>Department:</strong> {authUser?.department?.name || "-"}</p>
            </div>
        </section>
    );
}
