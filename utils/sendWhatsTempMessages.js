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
                    link: "https://i.ibb.co/35049q3L/Gemini-Generated-Image-58pr9f58pr9f58pr.png",
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
            {
              type: "header",
              parameters: [
                {
                  type: "image",
                  image: {
                    link: "https://i.ibb.co/fG09vR7M/Gemini-Generated-Image-chks6cchks6cchks-1.png",
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