import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import flowSessionSchema from "../../models/flowSessionSchema.js";

const WHATSAPP_API_URL = `https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

// Flow outer image (must be < 5MB)
const ORDER_FLOW_IMAGE_URL = "https://i.ibb.co/991jhHK4/and-1-2.png";

export const sendOrderFlow = async (whatsappNumber) => {
  try {
    const FLOW_ID = "919635611233928";
    if (!FLOW_ID) {
      throw new Error("WHATSAPP_ORDER_FLOW_ID is missing");
    }

    // Create unique flow token
    const flowToken = `order_${uuidv4()}`;

    // Save session
    await flowSessionSchema.findOneAndUpdate(
      { whatsappNumber },
      {
        $set: {
          whatsappNumber,
          flowToken,
          flowType: "ORDER",
          updatedAt: new Date(),
        },
      },
      { upsert: true, new: true }
    );

    // Updated outer message payload
    const payload = {
      messaging_product: "whatsapp",
      to: whatsappNumber,
      type: "interactive",
      interactive: {
        type: "flow",

        header: {
          type: "image",
          image: {
            link: ORDER_FLOW_IMAGE_URL,
          },
        },

        body: {
          text:
            "*Upgrade the way you connect.*\n\n" +
            "Choose a smart card that helps you share your details instantly — no apps, no typing.\n\n" +
            "✔ One-tap sharing\n" +
            "✔ Works on all smartphones\n" +
            "✔ Professional & reusable",
        },

        footer: {
          text: "TapTune • Smart Cards",
        },

        action: {
          name: "flow",
          parameters: {
            flow_message_version: "3",
            flow_id: FLOW_ID,
            flow_token: flowToken,
            flow_cta: "Order Your Card",
            flow_action: "navigate",
            flow_action_payload: {
              screen: "INTRO_SCREEN",
            },
          },
        },
      },
    };

    const response = await axios.post(WHATSAPP_API_URL, payload, {
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    console.log(`✅ Order Flow sent to ${whatsappNumber}`);
    console.log("🧩 Flow token:", flowToken);

    return {
      success: true,
      flowToken,
      messageId: response.data.messages?.[0]?.id,
    };
  } catch (error) {
    console.error(
      "❌ Failed to send Order Flow:",
      error.response?.data || error.message
    );

    return {
      success: false,
      error: error.response?.data?.error?.message || error.message,
    };
  }
};
