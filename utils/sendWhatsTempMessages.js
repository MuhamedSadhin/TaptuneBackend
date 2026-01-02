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
                    link: "https://i.ibb.co/nqHffPS1/Gemini-Generated-Image-58pr9f58pr9f58pr.png",
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