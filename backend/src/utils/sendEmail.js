import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === "true",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

const EMAIL_ENABLED = process.env.EMAIL_ENABLED !== "false";

export default async function sendEmail(to, subject, text) {
    if (!EMAIL_ENABLED) {
        console.log(
            `📨 [EMAIL DISABLED] Would send to ${to}: "${subject}"`
        );
        return;
    }

    try {
        await transporter.sendMail({
            from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
            to,
            subject,
            text,
        });
    } catch (error) {
        console.error("❌ Email Sending Failed:", error);

        // In dev, don't kill the flow
        if (process.env.NODE_ENV !== "production") {
            return;
        }

        // In production, you can choose to fail
        throw new Error("Email sending failed");
    }
}
