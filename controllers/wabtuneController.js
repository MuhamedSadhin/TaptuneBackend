import axios from "axios";
import dotenv from "dotenv";
import Profile from "../models/profileSchema.js";
import flowSessionSchema from "../models/flowSessionSchema.js";
import { sendEditProfileFlow } from "../utils/handler/sendEditProfileFlow.js";
import { sendSignUpFlow } from "../utils/handler/sendSIgnUpFlow.js";
import { sendOrderFlow } from "../utils/handler/sendCardOrderFlow.js";
dotenv.config();

const apiToken = process.env.WHATSAPP_API;
const baseUrl = process.env.WHATSAPP_URL;
const phoneNumberId = process.env.PHONE_NO_ID;

// ✅ Send WhatsApp message with subscriber handling
export const sendMessage = async (req, res) => {
  const { phoneNumber, name } = req.body;

  if (!phoneNumber || !name) {
    return res.status(400).json({
      success: false,
      message: "Phone number and name are required",
    });
  }

  const indianNumber = phoneNumber;


  const getSubscriberUrl = `${baseUrl}subscriber/get`;
  const createSubscriberUrl = `${baseUrl}subscriber/create`;
  const sendMessageUrl = `${baseUrl}send/template`;
  const updateSubscriberUrl = `${baseUrl}subscriber/update`;

  const templateId = "225578";
  const mediaUrl =
    "https%3A%2F%2Fbot-data.s3.ap-southeast-1.wasabisys.com%2Fupload%2F2025%2F8%2Fflowbuilder%2Fflowbuilder-108017-1756191660.jpg";
  const labelIdToUpdate = "169013";

  try {
    // 1. Check subscriber exists
    const checkResponse = await axios.post(getSubscriberUrl, {
      apiToken,
      phone_number_id: phoneNumberId,
      phone_number: indianNumber,
    });

    let subscriberExists =
      checkResponse.data.status &&
      Array.isArray(checkResponse.data.message) &&
      checkResponse.data.message.length > 0;

    // 2. Create subscriber if not exists
    if (!subscriberExists) {
      const createResponse = await axios.post(createSubscriberUrl, {
        apiToken,
        phone_number_id: phoneNumberId,
        phone_number: indianNumber,
        first_name: name,
      });

      if (!createResponse.data.status) {
        return res
          .status(400)
          .json({ success: false, message: "Subscriber not created" });
      }
    }

    // 3. Send WhatsApp message
    const sendResponse = await axios.post(sendMessageUrl, {
      apiToken,
      phone_number_id: phoneNumberId,
      template_id: templateId,
      template_header_media_url: mediaUrl,
      phone_number: indianNumber,
    });

    if (!sendResponse.data.status) {
      return res
        .status(500)
        .json({ success: false, message: "Failed to send message" });
    }

    // 4. Update subscriber label (optional, non-blocking)
    try {
      const updateResponse = await axios.post(updateSubscriberUrl, {
        apiToken,
        phone_number_id: phoneNumberId,
        phone_number: indianNumber,
        first_name: name,
        label_ids: labelIdToUpdate,
      });

      if (!updateResponse.data.status) {
        console.error("Failed to update subscriber label");
      }
    } catch (updateError) {
      console.error("Error updating subscriber label:", updateError?.message);
    }

    return res
      .status(200)
      .json({ success: true, message: "Message sent successfully" });
  } catch (error) {
    console.error(
      "Unexpected error in sendMessage:",
      error?.response?.data || error.message
    );
    return res.status(500).json({
      success: false,
      message: "An error occurred while processing the request",
      error: error?.response?.data || error.message,
    });
  }
};

// ✅ Get subscribers
export const getSubscribers = async (req, res) => {
  const { limit = 10, offset = 1, orderBy = 0 } = req.body;

  const listUrl = `${baseUrl}subscriber/list`;

  try {
    const response = await axios.post(listUrl, {
      apiToken,
      phone_number_id: phoneNumberId,
      limit,
      offset,
      orderBy,
    });

    if (response.data.status === "1") {
      return res.status(200).json({
        success: true,
        message: "Subscribers fetched successfully",
        data: response.data.message,
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "Failed to fetch subscribers",
        data: response.data.message || [],
      });
    }
  } catch (error) {
    console.error(
      "Error fetching subscribers:",
      error?.response?.data || error.message
    );
    return res.status(500).json({
      success: false,
      message: "An error occurred while fetching subscribers",
      error: error?.response?.data || error.message,
    });
  }
};




export const updateProfileViaWhatsapp = async (req, res) => {
  try {
    const { phone, fullName, bio, designation, brandName, email } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        status: "missing_phone",
        message: "Phone number is required",
      });
    }

    const profile = await Profile.findOne({
      $or: [{ phoneNumber: phone }, { watsappNumber: phone }],
    });

    if (!profile) {
      console.log("No profile found for phone number: ❗❗❗", phone);
      return res.status(200).json({
        success: false,
        status: "not_found",
        message: "No profile found for this phone number",
      });
    }

    // 4️⃣ Update only provided fields
    if (fullName) profile.fullName = fullName;
    if (bio) profile.bio = bio;
    if (designation) profile.designation = designation;
    if (brandName) profile.brandName = brandName;
    if(email) profile.email = email;

    await profile.save();

    // 5️⃣ Success response (BotSailor friendly)
    console.log("Profile updated for phone number: ✅✅✅", phone);
    return res.status(200).json({
      success: true,
      status: "updated",
      message: "Profile updated successfully ✅",
    });
  } catch (error) {
    console.error("WhatsApp profile update error:", error);

    return res.status(500).json({
      success: false,
      status: "error",
      message: "Internal server error",
    });
  }
};



export const verifyWhatsappWebhook = async (req, res) => {
  try {
    const VERIFY_TOKEN = "my_verify_token_123"; // same as Meta dashboard

    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("✅ WhatsApp webhook verified");

      return res.status(200).send(challenge);
    }

    console.log("❌ Webhook verification failed");

    return res.status(403).json({
      success: false,
      status: "verification_failed",
      message: "Webhook verification failed",
    });
  } catch (error) {
    console.error("🔥 Webhook verification error:", error);

    return res.status(500).json({
      success: false,
      status: "server_error",
      message: "Internal server error",
    });
  }
};

export const whatsappWebhookHandler = async (req, res) => {
  try {
    const entry = req.body?.entry?.[0];
    const value = entry?.changes?.[0]?.value;

    if (!value || value.statuses) return res.sendStatus(200);

    const message = value.messages?.[0];
    const waId = value.contacts?.[0]?.wa_id;

    if (!message || !waId) return res.sendStatus(200);

    console.log(`📩 Incoming ${message.type} from ${waId}`);

    if (message.type === "text" || message.type === "button") {
      let text = "";
      console.log(
        "message :",message
      )
      if (message.type === "text") {
        text = message.text?.body.toLowerCase();
      } else if (message.type === "button") {
        // Check payload first (ID), then text (Display)
        text = message.button?.text.toLowerCase(); 
      }

      console.log(`💬 Message text: "${text}"`);

      await flowSessionSchema.findOneAndUpdate(
        { whatsappNumber: waId },
        {
          whatsappNumber: waId,
          lastUserMessageAt: new Date(),
        },
        { upsert: true }
      );

      if (
        [
          "signup",
          "create account",
          "join",
          "register",
          "start",
          "hi",
          "hello",
        ].includes(text)
      ) {
        console.log(`🚀 Triggering Sign Up Flow for ${waId}`);
        await sendSignUpFlow(waId);
      } else if (
        ["edit profile", "update profile", "change details", "edit"].includes(
          text
        )
      ) {
        console.log(`✏️ Triggering Edit Profile Flow for ${waId}`);
        await sendEditProfileFlow(waId);
      } else if (
        [
          "setup profile",
          "buy",
          "card",
          "shop",
          "purchase",
          "new card",
        ].includes(text)
      ) {
        console.log(`💳 Triggering Order Flow for ${waId}`);
        await sendOrderFlow(waId);
      }

      return res.sendStatus(200);
    }

    return res.sendStatus(200);
  } catch (error) {
    console.error("🔥 Webhook error:", error);
    return res.sendStatus(200);
  }
};


