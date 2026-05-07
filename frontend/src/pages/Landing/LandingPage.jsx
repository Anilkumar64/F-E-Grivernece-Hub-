import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, CheckCircle2, FileText, Search, Send } from "lucide-react";
import api from "../../api/axiosInstance";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import BrandMark from "../../components/common/BrandMark";
import { resolveBrandAsset } from "../../hooks/useBranding";

const iconMap = { Send, Search, CheckCircle: CheckCircle2, CheckCircle2, FileText, Bell };

const fallback = {
    universityName: "Kernel University",
    heroTitle: "Submit. Track. Resolve.",
    heroSubtitle: "A transparent grievance platform for students and campus administrators.",
    features: [
        { icon: "Send", title: "Submit Grievances", description: "Raise issues with evidence in minutes." },
        { icon: "Search", title: "Track Progress", description: "Follow every status update and admin response." },
        { icon: "CheckCircle2", title: "Get Resolution", description: "Stay notified until your concern is resolved." },
    ],
    announcements: [],
    aboutText: "We help students raise concerns clearly and help teams resolve them responsibly.",
    contactEmail: "support@university.ac.in",
    contactPhone: "",
    isPublished: true,
};

export default function LandingPage() {
    const [config, setConfig] = useState(fallback);
    const [slideIndex, setSlideIndex] = useState(0);

    useEffect(() => {
        api.get("/landing-config", { skipAuthRefresh: true })
            .then((res) => {
                const incoming = res.data.config;
                setConfig(incoming?.isPublished ? incoming : fallback);
            })
            .catch(() => setConfig(fallback));
    }, []);

    const activeAnnouncements = (config.announcements || []).filter((item) => item.isActive);
    const heroStyle = config.heroImage ? { backgroundImage: `linear-gradient(90deg, rgba(255,255,255,.94), rgba(239,246,255,.86)), url(${config.heroImage})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined;
    const sliderImages = (config.sliderImages || []).filter(Boolean);

    useEffect(() => {
        if (sliderImages.length <= 1) return undefined;
        const timer = setInterval(() => {
            setSlideIndex((prev) => (prev + 1) % sliderImages.length);
        }, 3500);
        return () => clearInterval(timer);
    }, [sliderImages.length]);

    return (
        <main className="min-h-screen bg-gray-50">
            <nav className="sticky top-0 z-40 border-b border-gray-100 bg-white/80 backdrop-blur">
                <div className="app-container flex h-16 items-center justify-between">
                    <strong className="flex items-center gap-3 text-sm font-semibold tracking-tight text-gray-900">
                        <BrandMark />
                    </strong>
                    <div className="hidden items-center gap-6 text-sm font-medium text-gray-600 md:flex">
                        <a href="#home" className="transition-all duration-200 hover:text-indigo-600">Home</a>
                        <a href="#about" className="transition-all duration-200 hover:text-indigo-600">About</a>
                        <a href="#contact" className="transition-all duration-200 hover:text-indigo-600">Contact Us</a>
                        <Button as={Link} variant="outline" to="/login">User Login</Button>
                        <Button as={Link} to="/signup">User Signup</Button>
                    </div>
                </div>
            </nav>
            <section className="app-container grid gap-6 py-8">
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm lg:p-8" id="home" style={heroStyle}>
                    <div className="space-y-5">
                        {!!config.universityLogo && (
                            <img
                                src={resolveBrandAsset(config.universityLogo)}
                                alt={`${config.universityName} logo`}
                                className="h-14 w-14 rounded-xl border border-gray-200 bg-white object-cover"
                            />
                        )}
                        {activeAnnouncements.length > 0 && <Badge>{activeAnnouncements[0].title}</Badge>}
                        <h1 className="max-w-4xl text-3xl font-bold tracking-tight text-gray-900 lg:text-5xl">{config.heroTitle}</h1>
                        <p className="max-w-3xl text-base leading-relaxed text-gray-600">{config.heroSubtitle}</p>
                        <div className="flex flex-wrap gap-3">
                            <Button as={Link} to="/login">Student Login</Button>
                            <Button as={Link} variant="outline" to="/signup">Create Student Account</Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Badge className="bg-gray-100 text-gray-700">Real-time status updates</Badge>
                            <Badge className="bg-gray-100 text-gray-700">Secure document upload</Badge>
                            <Badge className="bg-gray-100 text-gray-700">Transparent resolution timeline</Badge>
                        </div>
                    </div>
                </div>
            </section>
            {sliderImages.length > 0 && (
                <section className="app-container pb-8" aria-label="Campus highlights">
                    <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                        <img className="h-80 w-full object-cover transition-all duration-200" src={sliderImages[slideIndex % sliderImages.length]} alt={`Campus slide ${slideIndex + 1}`} />
                        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
                            {sliderImages.map((_, idx) => (
                                <button
                                    key={`dot-${idx}`}
                                    type="button"
                                    className={`h-2 rounded-full transition-all duration-200 ${idx === (slideIndex % sliderImages.length) ? "w-6 bg-indigo-600" : "w-2 bg-white/80"}`}
                                    aria-label={`Go to slide ${idx + 1}`}
                                    onClick={() => setSlideIndex(idx)}
                                />
                            ))}
                        </div>
                    </div>
                </section>
            )}
            <section className="app-container grid gap-4 pb-8 md:grid-cols-2 lg:grid-cols-3" id="about">
                {(config.features || fallback.features).slice(0, 6).map((feature) => {
                    const Icon = iconMap[feature.icon] || FileText;
                    return (
                        <Card key={`${feature.title}-${feature.icon}`} className="space-y-3">
                            <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
                                <Icon size={20} />
                            </div>
                            <h2 className="text-base font-semibold tracking-tight text-gray-900">{feature.title}</h2>
                            <p className="text-sm leading-relaxed text-gray-600">{feature.description}</p>
                        </Card>
                    );
                })}
            </section>
            <section className="app-container grid gap-4 pb-8 md:grid-cols-3">
                {[
                    ["1. Login or Signup", "Get instant access to your grievance dashboard with a student account."],
                    ["2. Submit with Details", "Raise complaints with category, description, and supporting attachments."],
                    ["3. Track to Resolution", "Follow every status change and admin reply until closure."],
                ].map(([title, description]) => (
                    <Card key={title} className="space-y-2">
                        <h3 className="text-base font-semibold tracking-tight text-gray-900">{title}</h3>
                        <p className="text-sm leading-relaxed text-gray-600">{description}</p>
                    </Card>
                ))}
            </section>
            <section className="app-container pb-8" id="contact">
                <Card className="space-y-2">
                    <h2 className="text-lg font-semibold tracking-tight text-gray-900">About</h2>
                    <p className="text-sm leading-relaxed text-gray-600">{config.aboutText}</p>
                    <p className="text-sm text-gray-500">{config.contactEmail}{config.contactPhone ? ` · ${config.contactPhone}` : ""}</p>
                </Card>
            </section>
            <footer className="border-t border-gray-100 bg-white">
                <div className="app-container flex items-center justify-between py-6 text-sm text-gray-500">
                    <div className="flex items-center gap-3">
                        <BrandMark />
                    </div>
                    <span>Home · About · Contact · {new Date().getFullYear()}</span>
                </div>
            </footer>
        </main>
    );
}
