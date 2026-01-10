import CardOrder from "../models/cardOrders.js";
import Card from "../models/cardSchema.js";
import Profile from "../models/profileSchema.js";
import { v4 as uuidv4 } from "uuid";
import User from "../models/userSchema.js";
import { sendWhatsAppTemplateMessage } from "../utils/sendWabtuneMessage.js";
import notificationSchema from "../models/notificationSchema.js";
import paymentSchema from "../models/paymentSchema.js";

export const viewAllCards = async (req, res) => {
  try {
    // const isAdmin = req.user?.role == "Admin" || false;
    // console.log(req.user);

    // let query = {};
    // if (!isAdmin) {
    //   query.isActive = true; 
    // }

    // const cards = await Card.find(query).sort({ isActive: -1 });
    const cards = await Card.find().sort({ isActive: -1 });

    res.status(200).json({
      success: true,
      message: "Cards fetched successfully",
      data: cards,
    });
  } catch (error) {
    console.error("Error fetching cards:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching cards",
      error: error.message,
    });
  }
};

export const viewOneCard = async(req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Card ID is required"
            });
        }
        const card = await Card.findById(id);
        if (!card) {
            return res.status(404).json({
                success: false,
                message: "Card not found"
            });
        }
        res.status(200).json({
            success: true,
            message: "Card fetched successfully",
            data: card
        });
    } catch (error) {
        res.status(500).json({
            success: false, 
            message: "Server error while fetching card",
            error: error.message        
        });
    }
}



export const orderCardAndCreateProfile = async (req, res) => {
  try {
    const {
      cardId,
      fullName,
      designation,
      phone,
      email,
      quantity,
      logoImage,
      deliveryAddress, // Optional
      razorpayOrderId,
      paymentId,
      amount,
    } = req.body;

    const userId = req.user.id;
    const role = req.user.role;

    // 1. Basic Validation
    if (
      !userId ||
      !cardId ||
      !fullName ||
      !designation ||
      !phone ||
      !email ||
      !quantity ||
      !amount
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields.",
      });
    }

    // 2. Update User Status
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { isOrdered: true } },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // 3. Create Card Order
    // Handle optional address gracefully
    const cardOrder = await CardOrder.create({
      userId,
      cardId,
      fullName,
      designation,
      phoneNumber: phone,
      email,
      quantity,
      logoImage,
      totalAmount: amount,
      deliveryAddress: {
        houseNo: deliveryAddress?.houseNo || "",
        landmark: deliveryAddress?.landmark || "",
        city: deliveryAddress?.city || "",
        state: deliveryAddress?.state || "",
        pincode: deliveryAddress?.pincode || "",
        country: "India",
      },
      status: "Pending",
    });

    // 4. Create Profile
    const uniqueViewId = `USR-${cardOrder._id
      .toString()
      .slice(-4)}-${Date.now()}`;

    const profile = await Profile.create({
      userId,
      cardOrderId: cardOrder._id,
      viewId: uniqueViewId,
      fullName,
      email,
      phoneNumber: phone,
      designation,
      isActive: false, // Inactive until processed
    });

    // Link profile to order
    await CardOrder.findByIdAndUpdate(cardOrder._id, {
      profileId: profile._id,
    });

    // 5. Record Payment (If User)
    if (role === "user") {
      if (!razorpayOrderId || !paymentId || !amount) {
        return res.status(400).json({
          success: false,
          message: "Payment details missing",
        });
      }

      await paymentSchema.create({
        userId,
        cardOrderId: cardOrder._id,
        razorpayOrderId,
        razorpayPaymentId: paymentId,
        amount,
        status: "paid",
        isReviewCard: false,
        customerPhone: phone,
      });
    }

    // 6. Create Notification
    await Notification.create({
      title: "New Order Received",
      name: fullName,
      email,
      content: `${fullName} has placed a new order for ₹${amount}.`,
      type: "order",
      relatedId: cardOrder._id,
    });

    if (phone) {
      sendWhatsAppTemplateMessage(
        "226076", // Template Name/ID
        "https://bot-data.s3.ap-southeast-1.wasabisys.com/upload/2025/8/flowbuilder/flowbuilder-108017-1756203446.png", // Header Image
        phone,
        fullName,
        "169013" // Dynamic Parameter
      )
        .then((response) => console.log("WhatsApp sent:", response))
        .catch((err) => console.error("WhatsApp Failed:", err.message));
    }

    return res.status(201).json({
      success: true,
      message: "Card order placed successfully.",
      order: cardOrder,
      profile,
    });
  } catch (error) {
    console.error("Order API Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};





export const updateCard = async (req, res) => {
  try {
    const { id, data } = req.body;

    if (!id || !data) {
      return res
        .status(400)
        .json({
          message: "Invalid request. 'id' and 'data' are required.",
          success:false
         });
    }

    const updatedCard = await Card.findByIdAndUpdate(id, data, {
      new: true, 
      runValidators: true,
    });

    if (!updatedCard) {
      return res.status(404).json({
        message: "Card not found",
        success:false
       });
    }

    res
      .status(200)
      .json({
        message: "Card updated successfully",
        card: updatedCard,
        success:true
      });
  } catch (error) {
    console.error("Error updating card:", error);
    res.status(500).json({
      message: "Internal server error",
      success:false
     });
  }
};




export const createCard = async (req, res) => {
  try {
    const {
      cardName,
      price,
      category,
      frontImage,
      backImage,
      isQr = false,
      isLogo = false,
      isActive = true,
    } = req.body;

    if (!cardName || !price || !category || !frontImage || !backImage) {
      return res
        .status(400)
        .json({
          message: "All required fields must be provided.",
          success: false,
         });
    }

    const newCard = new Card({
      cardName,
      price,
      category,
      frontImage,
      backImage,
      isQr,
      isLogo,
      isActive,
    });

    await newCard.save();

    res.status(201).json({
      message: "Card created successfully",
      success: true,
      data: newCard,
    });
  } catch (error) {
    console.error("Error creating card:", error);
    res.status(500).json({
      message: "Server error", error: error.message,
      success: false,
     });
  }
};

export const updateCardOrderStatus = async (req, res) => {
  try {
    const { orderId, status } = req.body;

    if (!orderId || !status) {
      return res
        .status(400)
        .json({ success: false, message: "orderId and status are required" });
    }

    const updatedOrder = await CardOrder.findByIdAndUpdate(
      orderId,
      { status },
      { new: true } 
    );

    if (!updatedOrder) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Order status updated successfully",
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server error", error });
  }
};

export const toggleCardStatusIsActive = async (req, res) => {
  try {
    const { id, isActive } = req.body;

    if (!id || typeof isActive === "undefined") {
      return res.status(400).json({
        message: "Invalid request. 'id' and 'isActive' are required.",
        success: false,
      });
    }

    const updatedCard = await Card.findByIdAndUpdate(
      id,
      { isActive },
      { new: true, runValidators: true }
    );

    if (!updatedCard) {
      return res.status(404).json({
        message: "Card not found",
        success: false,
      });
    }

    res.status(200).json({
      message: `Card status updated to ${isActive ? "Active" : "Inactive"}`,
      card: updatedCard,
      success: true,
    });
  } catch (error) {
    console.error("Error updating card status:", error);
    res.status(500).json({
      message: "Internal server error",
      success: false,
    });
  }
};




export const CreateProfileByAdmin = async (req, res) => {
  try {
    const {
      cardId,
      fullName,
      email,
      designation,
      phoneNumber,
      username,
      brandName,
      whatsappNumber,
      bio,
      quantity,
    } = req.body;

    const userId = req.user?._id;


    if (
      !userId ||
      !fullName ||
      !email ||
      !designation ||
      !phoneNumber ||
      !quantity
    ) {
      return res
        .status(400)
        .json({ message: "Missing required fields.", success: false });
    }

    // 🟢 Find latest active card
    const card = await Card.findOne({ isActive: true }).sort({ createdAt: -1 });
    if (!card) {
      return res.status(404).json({
        message:
          "No active card available. Please create an active card first.",
        success: false,
      });
    }

    // 🟡 Create card order
    const cardOrder = await CardOrder.create({
      userId,
      cardId: card._id,
      fullName,
      designation,
      phoneNumber,
      email,
      quantity,
      status: "Pending",
    });

    // Generate unique view ID
    const uniqueViewId = `USR-${cardOrder._id
      .toString()
      .slice(-4)}-${Date.now()}`;

    // 🟢 Create Profile
    const profile = await Profile.create({
      userId,
      cardOrderId: cardOrder._id,
      viewId: uniqueViewId,
      fullName,
      email,
      designation,
      phoneNumber,
      username: username || "",
      brandName: brandName || "",
      whatsappNumber: whatsappNumber || "",
      bio: bio || "",
      isActive: false,
      isAdminCreated:true,
    });

    // 🔗 Link profile to order
    await CardOrder.findByIdAndUpdate(cardOrder._id, {
      profileId: profile._id,
    });

    // 🔔 Create notification
    await notificationSchema.create({
      title: "New Profile Created by Admin! 👤",
      name: fullName,
      email: email,
      content: `${fullName} (${email}) has created a new profile by Admin.`,
      type: "profile",
      relatedId: profile._id,
    });

    // ✅ Success response
    return res.status(201).json({
      message: "Profile and card order created successfully.",
      order: cardOrder,
      profile,
      success: true,
    });
  } catch (error) {
    console.error("CreateProfileByAdmin error:", error);
    return res
      .status(500)
      .json({ message: "Internal server error.", success: false });
  }
};
