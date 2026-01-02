import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import flowSessionSchema from "../../models/flowSessionSchema.js";

const WHATSAPP_API_URL = `https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

// You can replace this with your uploaded media ID or a public URL
const WELCOME_IMAGE_URL =
  "https://i.ibb.co/v4rtD0Ty/Gemini-Generated-Image-13u6id13u6id13u6.png";
export const sendSignUpFlow = async (whatsappNumber) => {
  try {
    // 1. Validate Flow ID
    // Use the ID of the Flow JSON we created earlier (3 screens)
    const FLOW_ID = "841420895323846";

    if (!FLOW_ID) {
      throw new Error(
        "WHATSAPP_SIGNUP_FLOW_ID is missing in environment variables"
      );
    }

    // 2. Create Unique Token
    // We prefix with 'signup_' to easily identify the flow type in the webhook later
    const flowToken = `signup_${uuidv4()}`;

    // 3. Save Session to DB
    // This is crucial so when the user submits data, we know who they are based on the token
    await flowSessionSchema.findOneAndUpdate(
      { whatsappNumber },
      {
        $set: {
          whatsappNumber,
          flowToken,
          flowType: "SIGNUP", // Optional: helps track what flow they are in
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
            link: WELCOME_IMAGE_URL,
          },
        },
        body: {
          text: "Welcome to TapTune! 🎵\n\nCreate your account now to start organizing your music business.",
        },
        footer: {
          text: "TapTune Registration",
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
              screen: "ENTRY_SCREEN", // Matches your JSON Entry Screen ID
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

    console.log(`✅ SignUp Flow sent to ${whatsappNumber}`);
    console.log("🧩 Flow token:", flowToken);

    return {
      success: true,
      flowToken,
      messageId: response.data.messages?.[0]?.id,
    };
  } catch (error) {
    console.error(
      "❌ Failed to send SignUp Flow:",
      error.response?.data || error.message
    );

    return {
      success: false,
      error: error.response?.data?.error?.message || error.message,
    };
  }
};
