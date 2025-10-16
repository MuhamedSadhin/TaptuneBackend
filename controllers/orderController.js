import CardOrder from "../models/cardOrders.js";
import Enquiry from "../models/ContactSchema.js";
import Profile from "../models/profileSchema.js";
import User from "../models/userSchema.js";
// Get all orders
export const getAllOrders = async (req, res) => {
  try {
    const loggedInUser = req.user; // Must be set by auth middleware
    const { page = 1, limit = 10, search = "", status = "all" } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    let query = {};

    // Status filter
    if (status !== "all") {
      query.status = status;
    }

    // Role-based filtering (case-insensitive)
    const userRole = (loggedInUser.role || "").toLowerCase();
    if (userRole === "admin") {
      // Admin can see all orders
    } else if (userRole === "sales") {
      // Sales can see only orders of users they referred
      const referredUsers = await User.find({
        referalId: loggedInUser._id,
      }).select("_id");
      const referredUserIds = referredUsers.map((user) => user._id);
      query.userId = { $in: referredUserIds };
    } else {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to view orders",
      });
    }

    // Search filter
    if (search) {
      const searchRegex = new RegExp(search, "i");

      const matchingUsers = await User.find({ email: searchRegex }).select(
        "_id"
      );
      const userIds = matchingUsers.map((user) => user._id);

      const matchingProfiles = await Profile.find({
        $or: [{ fullName: searchRegex }, { email: searchRegex }],
      }).select("_id");
      const profileIds = matchingProfiles.map((profile) => profile._id);

      query.$or = [
        { fullName: searchRegex },
        { email: searchRegex },
        { designation: searchRegex },
        { userId: { $in: userIds } },
        { profileId: { $in: profileIds } },
      ];
    }

    // Total count
    const totalCount = await CardOrder.countDocuments(query);

    // Fetch orders with populations
    const orders = await CardOrder.find(query)
      .populate("profileId")
      .populate("cardId")
      .populate("userId")
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    // Map results
    const results = orders.map((order) => {
      const profile = order.profileId || {};
      const card = order.cardId || {};
      const user = order.userId || {};

      return {
        orderId: order._id,
        fullName: order.fullName || "",
        email: order.email || "",
        designation: order.designation || "",
        phoneNumber: order.phoneNumber || "",
        logoImage: order.logoImage || "",
        status: order.status,
        quantity: order.quantity,
        createdAt: order.createdAt,
        profileId: profile._id || null,
        profileEmail: profile.email || "",
        profileNumber: profile.phoneNumber || "",
        profilePic: profile.profilePic || "",
        bio: profile.bio || "",
        userName: profile.brandName || "",
        watsappNumber: profile.watsappNumber || "",
        ProfileDesignation: profile.designation || "",
        profileFullName: profile.fullName || "",
        viewId: profile.viewId || "",
        isActive: profile.isActive || false,
        cardId: card._id || null,
        cardName: card.cardName || "",
        category: card.category || "",
        price: card.price || 0,
        frontImage: card.frontImage || "",
        backImage: card.backImage || "",
        customerName: user.name || "",
        customerEmail: user.email || "",
      };
    });

    return res.status(200).json({
      success: true,
      message: "Orders fetched successfully",
      data: results,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalCount / limitNum),
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

// Get order stats
export const getOrderStats = async (req, res) => {
  try {
    const loggedInUser = req.user; // Must be set by auth middleware
    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let userFilter = {};
    let profileFilter = { isActive: true };

    // Role-based filtering (case-insensitive)
    const userRole = (loggedInUser.role || "").toLowerCase();
    if (userRole === "sales") {
      const referredUsers = await User.find({
        referalId: loggedInUser._id,
      }).select("_id");
      const referredUserIds = referredUsers.map((user) => user._id);

      userFilter = { userId: { $in: referredUserIds } };
      profileFilter.userId = { $in: referredUserIds };
    } else if (userRole !== "admin") {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to view stats",
      });
    }

    // Orders
    const totalOrders = await CardOrder.countDocuments(userFilter);
    const pendingOrders = await CardOrder.countDocuments({
      ...userFilter,
      status: "Pending",
    });
    const ordersThisMonth = await CardOrder.countDocuments({
      ...userFilter,
      createdAt: { $gte: startOfThisMonth },
    });

    // Profiles
    const activeProfiles = await Profile.countDocuments(profileFilter);

    return res.status(200).json({
      success: true,
      message: "Stats fetched successfully",
      data: {
        totalOrders,
        pendingOrders,
        ordersThisMonth,
        activeProfiles,
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