

// import nodemailer from "nodemailer";
// import dotenv from "dotenv";

// dotenv.config();

// export const sendEmail = async ({ to, subject, text, html }) => {
//   try {
//     if (
//       !process.env.BREVO_USER ||
//       !process.env.BREVO_PASS ||
//       !process.env.BREVO_FROM
//     ) {
//       throw new Error(
//         "❌ Brevo SMTP credentials are not set in environment variables."
//       );
//     }

//     // Create transporter
//     const transporter = nodemailer.createTransport({
//       host: "smtp-relay.brevo.com",
//       port: 587, // 587 for STARTTLS, 465 for SSL
//       secure: false, // false for STARTTLS
//       auth: {
//         user: process.env.BREVO_USER,
//         pass: process.env.BREVO_PASS,
//       },
//       tls: {
//         rejectUnauthorized: false, // allow self-signed certificates
//       },
//     });

//     // Prepare mail options
//     const mailOptions = {
//       from: process.env.BREVO_FROM,
//       to,
//       subject,
//       text,
//       html: html || `<p>${text}</p>`,
//     };

//     // Send email
//     const info = await transporter.sendMail(mailOptions);

//     console.log("✅ Email sent:", info.messageId);
//     return { success: true, messageId: info.messageId, info };
//   } catch (error) {
//     console.error("❌ Send email error:", error.message || error);
//     return { success: false, error: error.message || error };
//   }
// };




export const sendEmail = async ({ to, subject, text, html }) => {
  try {
    if (!to || !subject || !text) {
      throw new Error("Missing required fields: 'to', 'subject', or 'text'.");
    }

    if (!process.env.BREVO_API_KEY || !process.env.BREVO_FROM) {
      throw new Error(
        "Brevo API credentials are not set in environment variables."
      );
    }

    console.log(`📧 Sending email to: ${to}`);

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": process.env.BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: { email: process.env.BREVO_FROM },
        to: [{ email: to }],
        subject,
        htmlContent: html || `<p>${text}</p>`,
        textContent: text,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("❌ Brevo API error:", data);
      return { success: false, error: data };
    }

    console.log("✅ Email sent successfully via Brevo:", data);
    return { success: true, data };
  } catch (error) {
    console.error("❌ Send email failed:", error.message || error);
    return { success: false, error: error.message || error };
  }
};
