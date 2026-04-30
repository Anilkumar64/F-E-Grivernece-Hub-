import nodemailer from "nodemailer";

const EMAIL_ENABLED = process.env.EMAIL_ENABLED !== "false";

const getTransporter = () =>
    nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: Number(process.env.EMAIL_PORT) || 587,
        secure: process.env.EMAIL_SECURE === "true",
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

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
        console.error("Email sending failed:", error);
        if (process.env.NODE_ENV !== "production") {
            return;
        }
        throw new Error("Email sending failed");
    }
}
