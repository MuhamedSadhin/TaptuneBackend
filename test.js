import dotenv from "dotenv";
import mongoose from "mongoose";
import Payment from "./models/paymentSchema.js";
import { createRazorpayLink } from "./utils/RazorpayHandler/createPaymentLink.js";
import { sendWhatsappPaymentLink } from "./utils/handler/sendPaymentMessage.js";

dotenv.config();

await mongoose.connect(process.env.MONGO_URI);

const TEST_USER_ID = new mongoose.Types.ObjectId();
const PHONE = "919745170829";

async function runTest() {
  const cardOrderId = `TEST-${Date.now()}`;
  const amount = 100;

  /* 1️⃣ CREATE PAYMENT */
  await Payment.create({
    userId: TEST_USER_ID,
    cardOrderId,
    amount,
    customerPhone: PHONE,
    status: "pending",
  });

  /* 2️⃣ CREATE LINK */
  const paymentUrl = await createRazorpayLink(cardOrderId, amount, {
    name: "Test User",
    contact: "+" + PHONE,
    email: "test@example.com",
  });

  /* 3️⃣ SAVE LINK */
  await Payment.findOneAndUpdate({ cardOrderId }, { paymentLink: paymentUrl });

  /* 4️⃣ SEND WHATSAPP */
  await sendWhatsappPaymentLink(PHONE, paymentUrl, "Test User", amount);

  console.log("✅ WhatsApp sent. Complete payment now.");
}

runTest();
