import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

/**
 * Sends a WhatsApp payment template message with an Image Header.
 *
 * @param {string} recipientPhone - User's phone number (e.g., "919876543210")
 * @param {string} paymentUrl - Full payment link (e.g., "https://domain.com/pay/12345")
 * @param {string} customerName - Customer's name
 * @param {number|string} amount - Amount to be paid
 * @param {string} [imageUrl] - (Optional) URL of the invoice image or logo. Defaults to a placeholder if not provided.
 * @returns {Promise<Object>} - The Meta API response
 */
export const sendWhatsappPaymentLink = async (
  recipientPhone,
  paymentUrl,
  customerName,
  amount,
  imageUrl = "https://placehold.co/600x400/png?text=Invoice" // Default placeholder if no image provided
) => {
  try {
    // 1. Validate Environment Variables
    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!token || !phoneId) {
      throw new Error("Missing WhatsApp configuration in .env");
    }

    // 2. Data Cleaning & Formatting
    // Remove non-numeric characters from phone
    const cleanPhone = String(recipientPhone).replace(/[^0-9]/g, "");

    // Extract ID for the dynamic button (Assumes URL ends with ID)
    const paymentId = paymentUrl.split("/").pop();

    // Format Amount (e.g., converts 500 to "₹ 500.00")
    const formattedAmount = new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);

    // 3. Construct the API URL
    const url = `https://graph.facebook.com/v18.0/${phoneId}/messages`;

    // 4. Construct Payload
    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: cleanPhone,
      type: "template",
      template: {
        name: "payment_invoice", // Must match your Meta Template Name
        language: {
          code: "en", // Must match your Template Language
        },
        components: [
          // --- HEADER COMPONENT (IMAGE) ---
          {
            type: "header",
            parameters: [
              {
                type: "image",
                image: {
                  link: imageUrl, // The public URL of the image you want to send
                },
              },
            ],
          },
          // --- BODY COMPONENT ---
          {
            type: "body",
            parameters: [
              {
                type: "text",
                text: customerName, // Body {{1}}
              },
              {
                type: "text",
                text: formattedAmount, // Body {{2}}
              },
            ],
          },
          // --- BUTTON COMPONENT ---
          {
            type: "button",
            sub_type: "url",
            index: 0,
            parameters: [
              {
                type: "text",
                text: paymentId, // Button {{1}} (URL suffix)
              },
            ],
          },
        ],
      },
    };

    // 5. Send Request
    const config = {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    };

    const response = await axios.post(url, payload, config);
    return response.data;
  } catch (error) {
    // Enhanced Error Logging
    const errorDetails = error.response?.data || error.message;
    console.error(
      "❌ WhatsApp API Failed:",
      JSON.stringify(errorDetails, null, 2)
    );
    throw new Error("Failed to send WhatsApp payment message");
  }
};
