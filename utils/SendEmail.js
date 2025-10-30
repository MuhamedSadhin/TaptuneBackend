



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

    return { success: true, data };
  } catch (error) {
    console.error("❌ Send email failed:", error.message || error);
    return { success: false, error: error.message || error };
  }
};
