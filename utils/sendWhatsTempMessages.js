import axios from "axios";

export const sendProfileUpdatedTemplate = async ({
  phoneNumber,
  fullName,
  profileViewId,
}) => {
  try {
    return await axios.post(
      `https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: phoneNumber,
        type: "template",
        template: {
          name: "profile_updated_with_view_profile",
          language: { code: "en" },
          components: [
            {
              type: "header",
              parameters: [
                {
                  type: "image",
                  image: {
                    link: "https://imgs.search.brave.com/zyFtDdKt80WDlDUbnj16g3BHLRi-ChZzyQBpFBPQ72c/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly9wYXN0/YXRpYy5waWNzYXJ0/LmNvbS9jbXMtcGFz/dGF0aWMvY2ZmY2Q1/NmUtNTMxNy00YWRi/LWIyYTItOGU4YWIy/N2MwMTk0LnBuZw",
                  },
                },
              ],
            },
            // BODY
            {
              type: "body",
              parameters: [{ type: "text", text: fullName }],
            },
            // BUTTON
            {
              type: "button",
              sub_type: "url",
              index: "0",
              parameters: [{ type: "text", text: profileViewId }],
            },
          ],
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error(
      "❌ Template send failed:",
      error.response?.data || error.message
    );
    throw error;
  }
};


export const sendWelcomeTemplate = async ({ to, firstName }) => {
  try {
    await axios.post(
      `https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: "card_management", // ✅ EXACT approved template name
          language: { code: "en_US" },

          components: [
            // ✅ HEADER IMAGE (MANDATORY because template has image header)
            {
              type: "header",
              parameters: [
                {
                  type: "image",
                  image: {
                    link: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f",
                  },
                },
              ],
            },

            // ✅ BODY VARIABLE {{1}}
            {
              type: "body",
              parameters: [
                {
                  type: "text",
                  text: firstName || "there",
                },
              ],
            },
          ],
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ Welcome template sent successfully");
  } catch (error) {
    console.error(
      "❌ Template send failed:",
      error.response?.data || error.message
    );
  }
};