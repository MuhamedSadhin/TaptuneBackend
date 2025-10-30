import Razorpay from "razorpay";
import crypto from "crypto";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_SECRET,
});

export const createOrder = async (req, res) => {
  try {
      console.log("Request body for creating order:", req.body);
      const { amount, currency = "INR", receipt } = req.body;

    if (!amount) {
      return res
        .status(400)
        .json({ success: false, message: "Amount is required" });
    }

    const options = {
      amount: amount * 100, 
      currency,
      receipt: receipt || `receipt_${Date.now()}`,
      payment_capture: 1, 
    };

      const order = await razorpay.orders.create(options);
      console.log("Razorpay order created:", order);

    res.json({ success: true, order });
  } catch (err) {
    console.error("Razorpay create order error:", err);
    res.status(500).json({ success: false, message: "Order creation failed" });
  }
};


export const verifyPayment = (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
        req.body;
    console.log("Verifying payment with data:", req.body);

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res
      .status(400)
      .json({ success: false, message: "Incomplete payment data" });
  }

  const generated_signature = crypto
    .createHmac("sha256", process.env.RAZORPAY_SECRET)
    .update(razorpay_order_id + "|" + razorpay_payment_id)
    .digest("hex");

    if (generated_signature === razorpay_signature) {
      console.log("Payment verified successfully");
    return res.json({
      success: true,
      message: "Payment verified successfully",
    });
    } else {
        console.log("Payment verification failed");
    return res
      .status(400)
      .json({ success: false, message: "Payment verification failed" });
  }
};
