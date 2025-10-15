// import nodemailer from "nodemailer";
// import dotenv from "dotenv";
// dotenv.config();

// export const sendEmail = async (to, subject, text) => {
//   try {
//     const transporter = nodemailer.createTransport({
//       host: "smtp-relay.brevo.com",
//       port: 587,
//       secure: false,
//       auth: {
//         user: process.env.BREVO_USER,
//         pass: process.env.BREVO_PASS,
//       },
//     });

//     const mailOptions = {
//       from: process.env.BREVO_FROM,
//       to,
//       subject,
//       text,
//     };

//     const info = await transporter.sendMail(mailOptions);
//     return info;
//   } catch (error) {
//     console.error("❌ Send email error:", error);
//     throw error;
//   }
// };


import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

export const sendEmail = async ({ to, subject, text, html }) => {
  try {
    if (
      !process.env.BREVO_USER ||
      !process.env.BREVO_PASS ||
      !process.env.BREVO_FROM
    ) {
      throw new Error(
        "❌ Brevo SMTP credentials are not set in environment variables."
      );
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: "smtp-relay.brevo.com",
      port: 587, // 587 for STARTTLS, 465 for SSL
      secure: false, // false for STARTTLS
      auth: {
        user: process.env.BREVO_USER,
        pass: process.env.BREVO_PASS,
      },
      tls: {
        rejectUnauthorized: false, // allow self-signed certificates
      },
    });

    // Prepare mail options
    const mailOptions = {
      from: process.env.BREVO_FROM,
      to,
      subject,
      text,
      html: html || `<p>${text}</p>`, // fallback to HTML
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);

    console.log("✅ Email sent:", info.messageId);
    return { success: true, messageId: info.messageId, info };
  } catch (error) {
    console.error("❌ Send email error:", error.message || error);
    return { success: false, error: error.message || error };
  }
};

