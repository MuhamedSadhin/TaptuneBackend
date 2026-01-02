import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import flowSessionSchema from "../../models/flowSessionSchema.js";

const WHATSAPP_API_URL = `https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

// Ensure image is WhatsApp-safe (<5MB, preferably <1MB)
const SIGNUP_FLOW_IMAGE =
  "https://i.ibb.co/cXMXq7VY/Gemini-Generated-Image-13u6id13u6id13u6-1.png";

export const sendSignUpFlow = async (whatsappNumber) => {
  try {
    const FLOW_ID = "841420895323846";
    if (!FLOW_ID) {
      throw new Error("WHATSAPP_SIGNUP_FLOW_ID is missing");
    }

    /* ---------------- CREATE FLOW TOKEN ---------------- */
    const flowToken = `signup_${uuidv4()}`;

    /* ---------------- SAVE SESSION ---------------- */
    await flowSessionSchema.findOneAndUpdate(
      { whatsappNumber },
      {
        $set: {
          whatsappNumber,
          flowToken,
          flowType: "SIGNUP",
          updatedAt: new Date(),
        },
      },
      { upsert: true, new: true }
    );

    /* ---------------- PAYLOAD ---------------- */
    const payload = {
      messaging_product: "whatsapp",
      to: whatsappNumber,
      type: "interactive",
      interactive: {
        type: "flow",

        header: {
          type: "image",
          image: {
            link: SIGNUP_FLOW_IMAGE,
          },
        },

        body: {
          text:
            "*Welcome to TapTune.*\n\n" +
            "Create your account to manage your digital business card, share your profile instantly, and grow your professional network.",
        },

        footer: {
          text: "TapTune • Account Setup",
        },

        action: {
          name: "flow",
          parameters: {
            flow_message_version: "3",
            flow_id: FLOW_ID,
            flow_token: flowToken,
            flow_cta: "Create Account",
            flow_action: "navigate",
            flow_action_payload: {
              screen: "ENTRY_SCREEN",
            },
          },
        },
      },
    };

    /* ---------------- SEND TO META ---------------- */
    const response = await axios.post(WHATSAPP_API_URL, payload, {
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    console.log(`✅ Sign-Up Flow sent to ${whatsappNumber}`);
    console.log("🧩 Flow token:", flowToken);

    return {
      success: true,
      flowToken,
      messageId: response.data.messages?.[0]?.id,
    };
  } catch (error) {
    console.error(
      "❌ Failed to send Sign-Up Flow:",
      error.response?.data || error.message
    );

    return {
      success: false,
      message:
        error.response?.data?.error?.message || "Failed to send Sign-Up Flow",
    };
  }
};
