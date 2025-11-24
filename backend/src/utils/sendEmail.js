import nodemailer from "nodemailer";

const sendEmail = async ({ to, subject, html }) => {
    try {
        const transporter = nodemailer.createTransport({
            service: "gmail", // You can change this to Outlook, Yahoo etc.
            auth: {
                user: process.env.EMAIL_USER,      // Your email
                pass: process.env.EMAIL_PASS,      // App password
            },
        });

        const mailOptions = {
            from: `"E-Grievance Hub" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            html,
        };

        const info = await transporter.sendMail(mailOptions);

        console.log("📨 Email Sent Successfully:", info.messageId);
        return info;

    } catch (error) {
        console.error("❌ Email Sending Failed:", error);
        throw new Error("Email sending failed");
    }
};

export default sendEmail;
