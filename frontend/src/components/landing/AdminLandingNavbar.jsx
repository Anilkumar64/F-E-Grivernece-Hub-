import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import BrandMark from "../common/BrandMark";

export default function AdminNavbar() {
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();

    const toggleMenu = () => setOpen(prev => !prev);

    return (
        <nav className="sticky top-0 z-40 border-b border-gray-100 bg-white/80 backdrop-blur">
            <div className="app-container flex h-16 items-center justify-between">
                <div className="flex cursor-pointer items-center gap-3" onClick={() => navigate("/admin")}>
                    <BrandMark />
                </div>
                <div className="hidden items-center gap-6 text-sm font-medium text-gray-600 md:flex">
                    <Link to="/admin" className="transition-all duration-200 hover:text-indigo-600">Home</Link>
                    <Link to="/admin/about" className="transition-all duration-200 hover:text-indigo-600">About</Link>
                    <Link to="/admin/login" className="ui-btn-primary">Admin Login</Link>
                </div>
                <button className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-600 md:hidden" onClick={toggleMenu}>
                    {open ? <X size={18} /> : <Menu size={18} />}
                </button>
            </div>
            {open && (
                <div className="border-t border-gray-100 bg-white md:hidden">
                    <div className="app-container grid gap-2 py-3">
                        <Link
                            className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                            to="/admin"
                            onClick={() => setOpen(false)}
                        >
                            Home
                        </Link>
                        <Link
                            className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                            to="/admin/about"
                            onClick={() => setOpen(false)}
                        >
                            About
                        </Link>
                        <Link
                            className="ui-btn-primary"
                            to="/admin/login"
                            onClick={() => setOpen(false)}
                        >
                            Admin Login
                        </Link>
                    </div>
                </div>
            )}
        </nav>
    );
}
