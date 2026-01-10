// Import your existing Razorpay instance

import razorpay from "./razorpayConfig.js";


export const createRazorpayLink = async (orderId, amount, customer) => {
  try {
    const amountInPaise = Math.round(amount * 100);
    const expiryTime = Math.floor(Date.now() / 1000) + 20 * 60;

    const options = {
      amount: amountInPaise,
      currency: "INR",
      accept_partial: false,
      reference_id: orderId,
      description: `Order #${orderId}`,
      customer: {
        name: customer.name,
        contact: customer.contact,
        email: customer.email,
      },
      notify: {
        sms: false,
        email: false,
        whatsapp: false, // Explicitly disable to avoid duplicate msgs if you use your own API
      },
      reminder_enable: true,
      expire_by: expiryTime,
      callback_url: "https://yourdomain.com/payment-success", // Update this for production
      callback_method: "get",
    };

    const response = await razorpay.paymentLink.create(options);
    console.log("Razorpay Link Gen Response:", response);

    return response.short_url;
  } catch (error) {
    console.error("Razorpay Link Gen Error:", error);
    throw new Error(
      error.error?.description || "Could not generate payment link"
    );
  }
};
