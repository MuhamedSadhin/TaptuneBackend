import CardOrder from "../models/cardOrders.js";
import Payment from "../models/paymentSchema.js";
import { sendWhatsappPaymentLink } from "../utils/handler/sendPaymentMessage.js";
import { createRazorpayLink } from "../utils/RazorpayHandler/createPaymentLink.js";
import razorpay from "../utils/RazorpayHandler/razorpayConfig.js";
import crypto from "crypto";  
import { createHmac } from "crypto";



export const createRazorpayOrder = async (req, res) => {
  try {
    const { amount } = req.body;
    const userId = req.user?._id;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid amount",
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized user",
      });
    }

    // ✅ SAFE receipt (≤ 40 chars)
    const receipt = `rcpt_${Date.now()}`;

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // paise
      currency: "INR",
      receipt,
      payment_capture: 1,
    });

    return res.status(200).json({
      success: true,
      message: "Razorpay order created successfully",
      order,
    });
  } catch (error) {
    console.error("Create Razorpay Order Error:", error);

    return res.status(500).json({
      success: false,
      message: error?.error?.description || "Unable to create Razorpay order",
    });
  }
};

export const verifyRazorpayPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Missing Razorpay payment details",
      });
    }

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Payment signature verification failed",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Payment verified successfully",
      data: {
        razorpay_order_id,
        razorpay_payment_id,
      },
    });
  } catch (error) {
    console.error("Verify Razorpay Payment Error:", error);

    return res.status(500).json({
      success: false,
      message: "Payment verification failed",
    });
  }
};


export const handleRazorpayWebhook = async (req, res) => {
  try {
    const signature = req.headers["x-razorpay-signature"];
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!signature || !secret) {
      console.error("Missing signature or secret");
      return res.status(400).send("Invalid webhook");
    }

    const rawBody = req.body;

    const expectedSignature = createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");

    if (expectedSignature !== signature) {
      console.error("Signature mismatch");
      return res.status(400).send("Invalid signature");
    }

    const eventData = JSON.parse(rawBody.toString());
    const event = eventData.event;

    console.log("Webhook Received:", event);

    const paymentLink = eventData.payload?.payment_link?.entity;

    if (paymentLink) {
      const referenceId = paymentLink.reference_id;
      console.log("Reference ID:", referenceId);

      if (event === "payment_link.paid") {
        const updated = await Payment.findOneAndUpdate(
          { razorpayOrderId: referenceId },
          { status: "paid", paidAt: new Date() },
          { new: true }
        );

        console.log("Payment updated:", updated);
      }

      if (
        event === "payment_link.expired" ||
        event === "payment_link.cancelled"
      ) {
        await Payment.findOneAndUpdate(
          { razorpayOrderId: referenceId },
          { status: "failed" }
        );
      }
    }

    return res.json({ success: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return res.status(500).send("Webhook error");
  }
};

export const sendPaymentLinkManually = async (req, res) => {
  try {
    const { cardOrderId, amount, customerPhone } = req.body;

    if (!cardOrderId || !amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Card Order ID and a valid amount are required",
      });
    }

    const orderDetails = await CardOrder.findById(cardOrderId);

    if (!orderDetails) {
      return res.status(404).json({
        success: false,
        message: "Card Order not found",
      });
    }

    const targetPhone = customerPhone || orderDetails.phoneNumber;

    if (!targetPhone) {
      return res.status(400).json({
        success: false,
        message: "Customer phone number is required",
      });
    }

    const previousAttempts = await Payment.countDocuments({ cardOrderId });
    const currentAttempt = previousAttempts + 1;

    const uniqueReferenceId = `${cardOrderId}_${currentAttempt}_${Date.now()}`;

    const paymentUrl = await createRazorpayLink(uniqueReferenceId, amount, {
      name: orderDetails.fullName || "TapTune Customer",
      contact: `+${targetPhone.replace(/\D/g, "")}`,
      email: orderDetails.email || "customer@taptune.in",
    });

    const newPayment = await Payment.create({
      userId: orderDetails.userId,
      cardOrderId,
      amount,
      customerPhone: targetPhone,
      status: "pending",
      attempt: currentAttempt,
      paymentLink: paymentUrl,
      razorpayOrderId: uniqueReferenceId,
    });

    await sendWhatsappPaymentLink(
      targetPhone,
      paymentUrl,
      orderDetails.fullName || "Customer",
      amount
    );

    return res.status(200).json({
      success: true,
      message: "Payment link generated and sent successfully",
      attempt: currentAttempt,
      paymentId: newPayment._id,
    });
  } catch (error) {
    console.error("Manual payment error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to generate payment link",
    });
  }
};


export const getAllPayments = async (req, res) => {
  try {
    /* ================= PAGINATION ================= */
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.max(Number(req.query.limit) || 10, 1);
    const skip = (page - 1) * limit;

    /* ================= FILTER INPUTS ================= */
    const search = (req.query.search || "").trim();
    const status = req.query.status;
    const loggedInUser = req.user;

    /* ================= BASE FILTER ================= */
    const filter = {};

    if (status && status !== "all") {
      filter.status = status;
    }

    /* ================= AGGREGATION PIPELINE ================= */
    const basePipeline = [
      /* 🔹 Join User */
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },

      /* 🔹 Role-based access (Sales → Referral users only) */
      ...(loggedInUser.role === "sales"
        ? [
            {
              $match: {
                "user.referalId": new mongoose.Types.ObjectId(loggedInUser._id),
              },
            },
          ]
        : []),

      /* 🔹 Status filter */
      Object.keys(filter).length ? { $match: filter } : null,

      /* 🔹 Search filter */
      ...(search
        ? [
            {
              $match: {
                $or: [
                  { "user.name": { $regex: search, $options: "i" } },
                  { "user.email": { $regex: search, $options: "i" } },
                  { "user.phone": { $regex: search, $options: "i" } },
                  { razorpayOrderId: { $regex: search, $options: "i" } },
                  { razorpayPaymentId: { $regex: search, $options: "i" } },
                ],
              },
            },
          ]
        : []),
    ].filter(Boolean); // removes null entries safely

    /* ================= DATA PIPELINE ================= */
    const dataPipeline = [
      ...basePipeline,
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          amount: 1,
          status: 1,
          attempt: 1,
          razorpayOrderId: 1,
          razorpayPaymentId: 1,
          paymentLink: 1,
          customerPhone: 1,
          isReviewCard: 1,
          cardOrderId: 1,
          reviewCardId: 1,
          createdAt: 1,

          user: {
            _id: "$user._id",
            name: "$user.name",
            email: "$user.email",
            phone: "$user.phone",
            referalId: "$user.referalId",
          },
        },
      },
    ];

    /* ================= COUNT PIPELINE ================= */
    const countPipeline = [...basePipeline, { $count: "count" }];

    /* ================= EXECUTION ================= */
    const [payments, countResult] = await Promise.all([
      Payment.aggregate(dataPipeline),
      Payment.aggregate(countPipeline),
    ]);

    const total = countResult[0]?.count || 0;

    /* ================= RESPONSE ================= */
    return res.status(200).json({
      success: true,
      message: "Payments fetched successfully",
      data: payments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("❌ Get Payments Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch payments",
    });
  }
};



export const getPaymentByCardOrderId = async (req, res) => {
  try {
    const { cardOrderId } = req.params;

    const payment = await Payment.findOne({ cardOrderId }).populate(
      "userId",
      "name email"
    );

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    res.json({
      success: true,
      data: payment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch payment",
    });
  }
};