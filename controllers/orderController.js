import CardOrder from "../models/cardOrders.js";
import Enquiry from "../models/ContactSchema.js";
import Profile from "../models/profileSchema.js";
import User from "../models/userSchema.js";


export const getAllOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", status = "all" } = req.query;

    const query = {};

    if (search) {
      const searchRegex = new RegExp(search, "i");
      query.$or = [
        { fullName: searchRegex },
        { email: searchRegex },
        { designation: searchRegex },
      ];
    }

    if (status !== "all") {
      query.status = status;
    }

    const totalCount = await CardOrder.countDocuments(query);

    const orders = await CardOrder.find(query)
      .populate("profileId")
      .populate("cardId")
      .sort({ createdAt: -1 })
      .skip((page - 1) * parseInt(limit))
      .limit(parseInt(limit));

    const results = orders.map((order) => {
      const profile = order.profileId || {};
      const card = order.cardId || {};
      return {
        orderId: order._id,
        fullName: order.fullName || "",
        email: order.email || "",

        profileId: profile._id || null,
        profileEmail: profile.email || "",
        profileNumber: profile.phoneNumber || "",
        bio: profile.bio || "",
        userName: profile.brandName || "",
        watsappNumber: profile.watsappNumber || "",
        ProfileDesignation: profile.designation || "",
        profileFullName: profile.fullName || "",
        viewId: profile.viewId || "",
        isActive: profile.isActive,

        designation: order.designation || "",
        phoneNumber: order.phoneNumber || "",
        logoImage: order.logoImage || "",
        status: order.status,
        quantity: order.quantity,

        profilePic: profile.profilePic || "",
        createdAt: order.createdAt,
        cardId: card._id || null,
        cardName: card.cardName || "",
        category: card.category || "",
        price: card.price || 0,
        frontImage: card.frontImage || "",
        backImage: card.backImage || "",
      };
    });

    return res.status(200).json({
      success: true,
      message: "Orders fetched successfully",
      data: results,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalCount / limit),
        totalRecords: totalCount,
      },
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching orders",
      error: error.message,
    });
  }
};
export const getOrderStats = async (req, res) => {
  try {
    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const totalOrders = await CardOrder.countDocuments();
    const activeProfiles = await Profile.countDocuments({ isActive: true });
    const pendingOrders = await CardOrder.countDocuments({ status: "Pending" });
    const ordersThisMonth = await CardOrder.countDocuments({
      createdAt: { $gte: startOfThisMonth },
    });

    return res.status(200).json({
      success: true,
      message: "Stats fetched successfully",
      data: {
        totalOrders,
        activeProfiles,
        pendingOrders,
        ordersThisMonth,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch stats",
      error: error.message,
    });
  }
};

export const getStatsForAdmin = async (req, res) => {
 try {
   const now = new Date();
   const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
   const endOfMonth = new Date(
     now.getFullYear(),
     now.getMonth() + 1,
     0,
     23,
     59,
     59
   );

   const [totalUsers, totalCardOrders, totalEnquiries, cardOrdersThisMonth] =
     await Promise.all([
       User.countDocuments(),
       CardOrder.countDocuments(),
       Enquiry.countDocuments(),
       CardOrder.countDocuments({
         createdAt: { $gte: startOfMonth, $lte: endOfMonth },
       }),
     ]);

   return res.json({
     success: true,
     message: "Statistics fetched successfully",
     data: {
       totalUsers,
       totalCardOrders,
       totalEnquiries,
       cardOrdersThisMonth,
     },
   });
 } catch (error) {
   console.error("Error fetching statistics:", error);
   return res.status(500).json({
     success: false,
     message: "Server error fetching statistics",
   });
 }
}

export const getOrderAndUserForAdminHomePage = async (req, res) => {
  try {
    const lastUsers = await User.find({})
      .sort({ createdAt: -1 })
      .limit(3)
      .select("name email createdAt");

    const lastCardOrders = await CardOrder.find({})
      .sort({ createdAt: -1 })
      .limit(3)
      .populate("userId", "name email") 
      .select("orderNumber status createdAt");

    return res.json({
      success: true,
      message: "Fetched last 3 users and card orders successfully",
      data: {
        lastUsers,
        lastCardOrders,
      },
    });
  } catch (error) {
    console.error("Error fetching recent activity:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching recent activity",
    });
  }

}


export const getChartDetails = async (req, res) => {
  try {
    const now = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(now.getMonth() - 5); 

    const cardOrders = await CardOrder.find({
      createdAt: { $gte: sixMonthsAgo },
    }).select("createdAt");

    const users = await User.find({
      createdAt: { $gte: sixMonthsAgo },
    }).select("createdAt");

    const groupByMonth = (items) => {
      const counts = {};
      items.forEach((item) => {
        const date = new Date(item.createdAt);
        const month = date.toLocaleString("default", { month: "long" });
        counts[month] = (counts[month] || 0) + 1;
      });
      return counts;
    };

    const orderCounts = groupByMonth(cardOrders);
    const userCounts = groupByMonth(users);

    const result = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(now.getMonth() - i);
      const monthName = date.toLocaleString("default", { month: "long" });

      result.push({
        month: monthName,
        cardOrders: orderCounts[monthName] || 0,
        users: userCounts[monthName] || 0,
      });
    }

    return res.json({
      success: true,
      message: "Fetched last 6 months stats",
      data: result,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Error fetching stats",
    });
  }
}