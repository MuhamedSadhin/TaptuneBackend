import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import flowSessionSchema from "../../models/flowSessionSchema.js";

const WHATSAPP_API_URL = `https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

// 📸 Image: A sleek hand holding a business card (Perfect for "Order Card")
const ORDER_FLOW_IMAGE_URL = "https://i.ibb.co/ksHDTNds/and.png";
export const sendOrderFlow = async (whatsappNumber) => {
  try {
    // 1. Validate Flow ID
    // Replace this with the specific Flow ID for your "Card Order" flow
    const FLOW_ID = "919635611233928";

    if (!FLOW_ID) {
      throw new Error("WHATSAPP_ORDER_FLOW_ID is missing");
    }

    // 2. Create Unique Token
    // Prefix with 'order_' so the unified webhook knows to use orderFlowHandler
    const flowToken = `order_${uuidv4()}`;

    // 3. Save Session to DB
    await flowSessionSchema.findOneAndUpdate(
      { whatsappNumber },
      {
        $set: {
          whatsappNumber,
          flowToken,
          flowType: "ORDER", // Tracks that the user is in the Order flow
          updatedAt: new Date(),
        },
      },
      { upsert: true, new: true }
    );

    // 4. Construct Payload
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
          text: "Get your TapTune Card today! 💳\n\nTap below to choose between our **Digital Business Card** or **Google Review Card**.",
        },
        footer: {
          text: "TapTune Orders",
        },
        action: {
          name: "flow",
          parameters: {
            flow_message_version: "3",
            flow_id: FLOW_ID,
            flow_token: flowToken,
            flow_cta: "Order Now",
            flow_action: "navigate",
            flow_action_payload: {
              screen: "INTRO_SCREEN", // Points to your new JSON's starting screen
            },
          },
        },
      },
    };

    // 5. Send Request to Meta
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
