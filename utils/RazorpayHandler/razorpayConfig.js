import Razorpay from "razorpay";
import dotenv from "dotenv";

// Load environment variables immediately, BEFORE creating the instance
dotenv.config();

// Check if keys exist (Optional debug step to ensure .env is read)
if (!process.env.RAZORPAY_KEY_ID) {
  console.error("❌ Error: RAZORPAY_KEY_ID is missing from .env file");
}

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  // Make sure this matches exactly what is in your .env file
  // (Commonly RAZORPAY_KEY_SECRET or just RAZORPAY_SECRET)
  key_secret: process.env.RAZORPAY_SECRET || process.env.RAZORPAY_KEY_SECRET,
});

export default razorpay;
