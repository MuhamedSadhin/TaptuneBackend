
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import flowSessionSchema from "../../models/flowSessionSchema.js";

const WHATSAPP_API_URL = `https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

export const sendEditProfileFlow = async (whatsappNumber) => {
  try {
    const FLOW_ID = "843295654996631";
    if (!FLOW_ID) {
      throw new Error("WHATSAPP_PROFILE_EDIT_FLOW_ID is missing");
    }

    const flowToken = `profile_edit_${uuidv4()}`;

    await flowSessionSchema.findOneAndUpdate(
      { whatsappNumber },
      {
        $set: {
          whatsappNumber,
          flowToken,
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );

    const response = await axios.post(
      WHATSAPP_API_URL,
      {
        messaging_product: "whatsapp",
        to: whatsappNumber,
        type: "interactive",
        interactive: {
          type: "flow",
          header: {
            type: "image",
            image: {
              link: "https://imgs.search.brave.com/Dr6sPfiVOu-GWlJKVbdmKXOQyCd06lcKe4xRbbmXRL8/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly9tZWRp/YS5nZXR0eWltYWdl/cy5jb20vaWQvMTAx/OTg5NjIzNC9waG90/by9wcm9maWxlLXNo/b3Qtb2YtYmVhdXRp/ZnVsLXlvdW5nLW1h/bi1zaG90LW9uLXN0/dWRpby5qcGc_cz02/MTJ4NjEyJnc9MCZr/PTIwJmM9azBzRWlU/NkhRUjFHcXFtamlS/czlLby1fVm91aFFw/WnRJeU9VSjRDODVm/WT0",
            },
          },
          body: {
            text: "You can update your profile details here.",
          },
          action: {
            name: "flow",
            parameters: {
              flow_message_version: "3",
              flow_id: FLOW_ID,
              flow_token: flowToken,
              flow_cta: "Edit Profile",
              flow_action: "navigate",
              flow_action_payload: {
                screen: "ENTRY_SCREEN",
              },
            },
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ Edit Profile Flow sent successfully");
    console.log("🧩 Flow token:", flowToken);
    console.log("📨 Meta response:", response.data);

    return {
      success: true,
      flowToken,
    };
  } catch (error) {
    console.error(
      "❌ Failed to send Edit Profile Flow:",
      error.response?.data || error.message
    );

    return {
      success: false,
      error: error.message,
    };
  }
};
