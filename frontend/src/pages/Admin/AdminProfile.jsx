import React, { useContext, useState } from "react";
import AuthContext from "../../context/AuthCore";
import api from "../../api/axiosInstance";
import toast from "react-hot-toast";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Modal from "../../components/ui/Modal";
import Input from "../../components/ui/Input";

export default function AdminProfile() {
    const { authUser, updateAuthUser } = useContext(AuthContext);
    const [uploading, setUploading] = useState(false);
    const [removing, setRemoving] = useState(false);
    const [error, setError] = useState("");
    const [openEditor, setOpenEditor] = useState(false);

    const name = authUser?.name || "Admin";
    const initials = name.split(" ").map((n) => n[0]?.toUpperCase()).join("").slice(0, 2);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setError("");
        setUploading(true);
        try {
            const form = new FormData();
            form.append("profilePhoto", file);
            const res = await api.patch("/users/me/avatar", form, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            updateAuthUser(res.data.user);
            toast.success("Profile photo updated");
        } catch (err) {
            setError(err.response?.data?.message || "Upload failed. Please try again.");
        } finally {
            setUploading(false);
            e.target.value = "";
        }
    };

    const removePhoto = async () => {
        setError("");
        setRemoving(true);
        try {
            const data = new FormData();
            data.append("removeProfilePhoto", "true");
            const res = await api.patch("/users/me/avatar", data);
            updateAuthUser(res.data.user);
            toast.success("Profile photo removed");
        } catch (err) {
            setError(err.response?.data?.message || "Unable to remove profile photo.");
        } finally {
            setRemoving(false);
        }
    };

    return (
        <section className="space-y-6">
            <div className="flex items-center justify-between gap-3">
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">Admin Profile</h1>
                <Button onClick={() => setOpenEditor(true)}>Manage Photo</Button>
            </div>

            <div className="grid gap-6 xl:grid-cols-[18rem_minmax(0,1fr)]">
                <Card className="flex flex-col items-center gap-2 text-center">
                    {authUser?.profilePhoto ? (
                        <img
                            src={authUser.profilePhoto}
                            alt="Profile"
                            className="h-24 w-24 rounded-full object-cover"
                        />
                    ) : (
                        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-indigo-50 text-3xl font-semibold text-indigo-700">{initials}</div>
                    )}
                    <h2 className="text-lg font-semibold tracking-tight text-gray-900">{authUser?.name}</h2>
                    <p className="text-sm text-gray-500">{authUser?.department?.name || "Department not assigned"}</p>
                    <Badge>Department Admin</Badge>
                </Card>

                <Card>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Info label="Full Name" value={authUser?.name} />
                        <Info label="Email" value={authUser?.email} />
                        <Info label="Staff ID" value={authUser?.staffId || "-"} />
                        <Info label="Department" value={authUser?.department?.name || "-"} />
                        <Info label="Role" value={authUser?.role === "admin" ? "Department Admin" : authUser?.role} />
                    </div>
                </Card>
            </div>

            <Modal open={openEditor} onClose={() => setOpenEditor(false)}>
                <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                        <h2 className="text-xl font-semibold tracking-tight text-gray-900">Profile Photo</h2>
                        <Button type="button" variant="ghost" onClick={() => setOpenEditor(false)}>Close</Button>
                    </div>
                    <label className="grid gap-2 text-sm font-medium text-gray-700">
                        Upload New Photo
                        <Input
                            type="file"
                            accept="image/jpeg,image/png"
                            onChange={handleFileChange}
                        />
                    </label>
                    <div className="flex justify-end">
                        <Button type="button" variant="outline" className="border-rose-200 text-rose-700 hover:bg-rose-50" onClick={removePhoto} disabled={removing || !authUser?.profilePhoto}>
                            {removing ? "Removing..." : "Remove Profile Photo"}
                        </Button>
                    </div>
                    {error && <p className="text-sm text-rose-600">{error}</p>}
                    <p className="text-xs text-gray-500">{uploading ? "Uploading photo..." : "JPG or PNG, max 2MB"}</p>
                </div>
            </Modal>
        </section>
    );
}

function Info({ label, value }) {
    return <div><span className="text-xs text-gray-500">{label}</span><p className="text-sm font-semibold text-gray-900">{value || "-"}</p></div>;
}
