import React, { useState, useRef, useEffect, useContext } from "react";
import { MessageCircle, X, Send, Loader2, Bot, User, ChevronDown } from "lucide-react";
import api from "../../api/axiosInstance";
import AuthContext from "../../context/AuthCore";

const WELCOME_MESSAGE = {
    role: "assistant",
    content: "Hi! I'm the E-Grievance assistant. Ask me anything about submitting, tracking, or following up on your grievances.",
};

const QUICK_QUESTIONS = [
    "How do I submit a grievance?",
    "How can I track my grievance?",
    "What does 'Escalated' status mean?",
    "Can I reopen a resolved grievance?",
];

export default function AiChatbot() {
    const { authUser } = useContext(AuthContext);
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState([WELCOME_MESSAGE]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [unavailable, setUnavailable] = useState(false);
    const bottomRef = useRef(null);
    const inputRef = useRef(null);

    // Only show for students
    if (authUser?.role && authUser.role !== "student") return null;

    useEffect(() => {
        if (open) {
            bottomRef.current?.scrollIntoView({ behavior: "smooth" });
            inputRef.current?.focus();
        }
    }, [open, messages]);

    const send = async (text) => {
        const msg = (text || input).trim();
        if (!msg) return;
        setInput("");

        const userMsg = { role: "user", content: msg };
        setMessages((prev) => [...prev, userMsg]);
        setLoading(true);

        try {
            const history = messages.slice(-8).map((m) => ({
                role: m.role === "assistant" ? "assistant" : "user",
                content: m.content,
            }));
            const res = await api.post("/ai/chat", { message: msg, history });
            if (res.data.available === false) {
                setUnavailable(true);
                setMessages((prev) => [
                    ...prev,
                    { role: "assistant", content: "I'm temporarily unavailable. Please check the Help section or contact your department admin." },
                ]);
            } else {
                setUnavailable(false);
                setMessages((prev) => [...prev, { role: "assistant", content: res.data.reply }]);
            }
        } catch {
            setMessages((prev) => [
                ...prev,
                { role: "assistant", content: "Something went wrong. Please try again." },
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleKey = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send();
        }
    };

    return (
        <>
            {/* Floating trigger button */}
            <button
                onClick={() => setOpen((v) => !v)}
                className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 shadow-lg shadow-indigo-300/40 transition-transform hover:scale-110 focus:outline-none"
                aria-label="Open AI assistant"
            >
                {open
                    ? <ChevronDown size={22} className="text-white" />
                    : <MessageCircle size={22} className="text-white" />
                }
                {!open && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-400 text-[9px] font-bold text-white">AI</span>
                )}
            </button>

            {/* Chat window */}
            {open && (
                <div className="fixed bottom-24 right-6 z-50 flex w-80 flex-col rounded-2xl border border-gray-200 bg-white shadow-2xl shadow-indigo-100/60 sm:w-96">
                    {/* Header */}
                    <div className="flex items-center justify-between rounded-t-2xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3">
                        <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                                <Bot size={16} className="text-white" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-white">Grievance Assistant</p>
                                <p className="text-xs text-indigo-200">{unavailable ? "Offline" : "Online · AI powered"}</p>
                            </div>
                        </div>
                        <button onClick={() => setOpen(false)} className="rounded-lg p-1 text-white/70 hover:text-white">
                            <X size={18} />
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4" style={{ maxHeight: "360px", minHeight: "240px" }}>
                        {messages.map((msg, i) => (
                            <div key={i} className={`flex items-start gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs ${msg.role === "user" ? "bg-indigo-100 text-indigo-700" : "bg-purple-100 text-purple-700"}`}>
                                    {msg.role === "user" ? <User size={13} /> : <Bot size={13} />}
                                </div>
                                <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                                    msg.role === "user"
                                        ? "rounded-tr-none bg-indigo-600 text-white"
                                        : "rounded-tl-none bg-gray-100 text-gray-800"
                                }`}>
                                    {msg.content}
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex items-center gap-2">
                                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-purple-100">
                                    <Bot size={13} className="text-purple-700" />
                                </div>
                                <div className="flex gap-1 rounded-2xl rounded-tl-none bg-gray-100 px-3 py-2">
                                    {[0, 1, 2].map((dot) => (
                                        <span key={dot} className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: `${dot * 0.15}s` }} />
                                    ))}
                                </div>
                            </div>
                        )}
                        <div ref={bottomRef} />
                    </div>

                    {/* Quick questions */}
                    {messages.length <= 1 && (
                        <div className="flex flex-wrap gap-1.5 border-t border-gray-100 px-4 py-2">
                            {QUICK_QUESTIONS.map((q) => (
                                <button
                                    key={q}
                                    onClick={() => send(q)}
                                    className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs text-indigo-700 hover:bg-indigo-100 transition-colors"
                                >
                                    {q}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Input */}
                    <div className="flex items-end gap-2 rounded-b-2xl border-t border-gray-100 p-3">
                        <textarea
                            ref={inputRef}
                            rows={1}
                            className="flex-1 resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                            placeholder="Ask a question…"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKey}
                            disabled={loading}
                        />
                        <button
                            onClick={() => send()}
                            disabled={!input.trim() || loading}
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm disabled:opacity-50 hover:bg-indigo-700 transition-colors"
                        >
                            {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
