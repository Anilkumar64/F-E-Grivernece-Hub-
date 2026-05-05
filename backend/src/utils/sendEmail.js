import nodemailer from "nodemailer";

const EMAIL_ENABLED = process.env.EMAIL_ENABLED !== "false";

// ✅ FIX MI-12: original code called nodemailer.createTransport() inside every
// sendEmail() invocation. Nodemailer transports maintain a connection pool;
// recreating them on every call throws away that pool, forcing a fresh TCP/TLS
// handshake for each email and potentially exhausting file descriptors under load.
// Fixed by using a module-level singleton that is created once and reused.
let _transporter = null;

const getTransporter = () => {
    if (_transporter) return _transporter;

    _transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: Number(process.env.EMAIL_PORT) || 587,
        secure: process.env.EMAIL_SECURE === "true",
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    return _transporter;
};

// Invalidate the cached transporter if config changes (e.g. in tests)
export const resetTransporter = () => {
    _transporter = null;
};

export default async function sendEmail(toOrOptions, subject, text) {
    const mail =
        typeof toOrOptions === "object"
            ? toOrOptions
            : { to: toOrOptions, subject, text };

    const { to } = mail;

    if (!EMAIL_ENABLED) {
        console.log(`[EMAIL DISABLED] Would send to ${to}: "${mail.subject}"`);
        return;
    }

    if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        const error = new Error("Email configuration is incomplete");
        if (process.env.NODE_ENV === "production") throw error;
        console.warn(error.message);
        return;
    }

    try {
        await getTransporter().sendMail({
            from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
            ...mail,
        });
    } catch (error) {
        // If the transporter is in a bad state, reset it so the next call gets a fresh one
        resetTransporter();
        console.error("Email sending failed:", error);
        if (process.env.NODE_ENV !== "production") {
            return;
        }
        throw new Error("Email sending failed");
    }
}