import ReviewCardOrder from "../models/ReviewCardOrders.js";
import User from "../models/userSchema.js";


export const createReviewCardOrder = async (req, res) => {
  try {
    const userId = req.user?._id; // ✅ FROM TOKEN
    const { cardId, brandName, googleReviewUrl, logo } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!cardId || !brandName || !googleReviewUrl) {
      return res.status(400).json({
        success: false,
        message: "Required fields are missing",
      });
    }

    const order = await ReviewCardOrder.create({
      userId,
      cardId,
      brandName,
      googleReviewUrl,
      logo,
      status: "pending",
    });

    return res.status(201).json({
      success: true,
      message: "Review card order created successfully",
      data: order,
    });
  } catch (error) {
    console.error("Create review card order error:", error);
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
