import axios from "axios";
import dotenv from "dotenv";

dotenv.config(); 

const apiToken = process.env.WHATSAPP_API;
const baseUrl = process.env.WHATSAPP_URL;
const phoneNumberId = process.env.PHONE_NO_ID;

export async function sendWhatsAppTemplateMessage(
  templateId,
  mediaUrl,
  phoneNumber,
  name,
  labelIdToUpdate = null 
) {
  try {
    if (!templateId || !mediaUrl || !phoneNumber) {
      throw new Error("templateId, mediaUrl, and phoneNumber are required");
    }

    const indianNumber = phoneNumber;


    const getSubscriberUrl = `${baseUrl}subscriber/get`;
    const createSubscriberUrl = `${baseUrl}subscriber/create`;
    const sendMessageUrl = `${baseUrl}send/template`;
    const updateSubscriberUrl = `${baseUrl}subscriber/update`;

    const checkResponse = await axios.post(getSubscriberUrl, {
      apiToken,
      phone_number_id: phoneNumberId,
      phone_number: indianNumber,
    });

    const subscriberExists =
      checkResponse.data.status &&
      Array.isArray(checkResponse.data.message) &&
      checkResponse.data.message.length > 0;

    if (!subscriberExists) {
      const createResponse = await axios.post(createSubscriberUrl, {
        apiToken,
        phone_number_id: phoneNumberId,
        phone_number: indianNumber,
        first_name: name || "Unknown",
      });

      if (!createResponse.data.status) {
        throw new Error("Subscriber not created");
      }
    }

    const sendResponse = await axios.post(sendMessageUrl, {
      apiToken,
      phone_number_id: phoneNumberId,
      template_id: templateId,
      template_header_media_url: mediaUrl,
      phone_number: indianNumber,
    });

    if (!sendResponse.data.status) {
      throw new Error("Failed to send WhatsApp message");
    }

    if (labelIdToUpdate) {
      try {
        const updateResponse = await axios.post(updateSubscriberUrl, {
          apiToken,
          phone_number_id: phoneNumberId,
          phone_number: indianNumber,
          first_name: name || "Unknown",
          label_ids: labelIdToUpdate,
        });

        if (!updateResponse.data.status) {
          console.error("⚠ Failed to update subscriber label");
        }
      } catch (updateError) {
        console.error("Error updating subscriber label:", updateError?.message);
      }
    }

    return {
      success: true,
      message: "Message sent successfully",
      data: sendResponse.data,
    };
  } catch (err) {
    console.error("Wabtune API error:", err.response?.data || err.message);
    return {
      success: false,
      message: "Failed to send WhatsApp message",
      error: err.response?.data || err.message,
    };
  }
}
