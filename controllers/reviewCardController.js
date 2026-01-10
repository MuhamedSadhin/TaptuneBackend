import mongoose from "mongoose";
import paymentSchema from "../models/paymentSchema.js";
import ReviewCardOrder from "../models/ReviewCardOrders.js";
import User from "../models/userSchema.js";


export const createReviewCardOrder = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    /* ================= AUTH ================= */
    const userId = req.user?._id;
    if (!userId) {
      await session.abortTransaction();
      session.endSession();
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    /* ================= INPUT ================= */
    const {
      cardId,
      brandName,
      googleReviewUrl,
      logo,
      deliveryAddress,
      amount,
      razorpayOrderId,
      paymentId,
    } = req.body;

    /* ================= VALIDATION ================= */
    if (!cardId || !brandName || !googleReviewUrl) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "cardId, brandName and googleReviewUrl are required",
      });
    }

    if (!amount || amount <= 0 || !razorpayOrderId) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "Valid amount and razorpayOrderId are required",
      });
    }

    /* ================= CREATE REVIEW ORDER ================= */
    const [reviewOrder] = await ReviewCardOrder.create(
      [
        {
          userId,
          cardId,
          brandName: brandName.trim(),
          googleReviewUrl: googleReviewUrl.trim(),
          logo: logo || "",
          deliveryAddress: {
            houseName: deliveryAddress?.houseName,
            landmark: deliveryAddress?.landmark,
            city: deliveryAddress?.city,
            state: deliveryAddress?.state,
            pincode: deliveryAddress?.pincode,
          },
          status: "pending",
        },
      ],
      { session }
    );

    /* ================= CREATE PAYMENT ================= */
    const [payment] = await paymentSchema.create(
      [
        {
          userId,
          reviewCardId: reviewOrder._id,
          isReviewCard: true,
          amount,
          razorpayOrderId,
          paymentId: paymentId || null,
          status: "paid",
          attempt: 1,
        },
      ],
      { session }
    );

    /* ================= COMMIT ================= */
    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({
      success: true,
      message: "Review card order and payment created .",
      data: {
        order: reviewOrder,
        payment,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    console.error("Create review card order + payment error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create review card order",
    });
  }
};
const ALLOWED_STATUSES = [
  "pending",
  "confirmed",
  "design_completed",
  "delivered",
];   

export const updateReviewCardOrderStatus = async (req, res) => {
  try {
    const { orderId, status } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: "orderId is required",
      });
    }

    if (!ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order status",
      });
    }

    const order = await ReviewCardOrder.findByIdAndUpdate(
      orderId,
      { status },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Order status updated successfully",
      data: order,
    });
  } catch (error) {
    console.error("Update order status error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update order status",
    });
  }
};

export const getAllReviewCardOrders = async (req, res) => {
  try {
    const { status } = req.query;
    const loggedInUser = req.user; 

    let filter = {};

    console.log("Logged in user:", loggedInUser);

    if (status && status !== "all") {
      filter.status = status;
    }

    if (loggedInUser.role === "sales" || loggedInUser.role === "Sales") {

      const referredUsers = await User.find(
        { referalId: loggedInUser._id },
        { _id: 1 }
      ).lean();

      const referredUserIds = referredUsers.map((u) => u._id);

      filter.userId = { $in: referredUserIds };
    }

    // ---------------- FETCH ORDERS ----------------
    const orders = await ReviewCardOrder.find(filter)
      .populate("userId", "name email referalCode")
      .populate("cardId", "cardName category")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    console.error("Fetch review card orders error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch review card orders",
    });
  }
};
