import CardOrder from "../models/cardOrders.js";
import Enquiry from "../models/ContactSchema.js";
import Profile from "../models/profileSchema.js";
import User from "../models/userSchema.js";
// Get all orders
export const getAllOrders = async (req, res) => {
  try {
    const loggedInUser = req.user; 
    const { page = 1, limit = 10, search = "", status = "all" } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    let query = {};

    if (status !== "all") {
      query.status = status;
    }

    const userRole = (loggedInUser.role || "").toLowerCase();
    if (userRole === "admin") {
       query = query;
    } else if (userRole === "sales") {
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
    const loggedInUser = req.user; // Must be set by auth middleware

    if (!loggedInUser) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized user",
      });
    }

    const now = new Date();
    const startOfMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      1,
      0,
      0,
      0
    );
    const endOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59
    );

    const userRole = (loggedInUser.role || "").toLowerCase();

    let userQuery = {};
    let orderQuery = {};
    if(userRole === "admin") {}

   else if (userRole === "sales") {
      // ✅ Sales can only see data related to their referred users
      const referredUsers = await User.find({
        referalId: loggedInUser._id, // Ensure spelling matches your schema field
      }).select("_id");

      const referredUserIds = referredUsers.map((u) => u._id);

      // If no referred users, return zeros
      if (referredUserIds.length === 0) {
        return res.json({
          success: true,
          message: "No referred user data available",
          data: {
            totalUsers: 0,
            totalCardOrders: 0,
            totalEnquiries: 0,
            cardOrdersThisMonth: 0,
          },
        });
      }

      userQuery = { _id: { $in: referredUserIds } };
      orderQuery = { userId: { $in: referredUserIds } };
    } else {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to view statistics",
      });
    }

    // Run all queries in parallel for speed
    const [totalUsers, totalCardOrders, totalEnquiries, cardOrdersThisMonth] =
      await Promise.all([
        User.countDocuments(userQuery),
        CardOrder.countDocuments(orderQuery),
        Enquiry.countDocuments({
  $or: [
    { status: "pending" },
    { status: { $exists: false } },
    { status: null },
  ],
}),

        CardOrder.countDocuments({
          ...orderQuery,
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
      error: error.message,
    });
  }
};


export const getOrderAndUserForAdminHomePage = async (req, res) => {
  try {
    const loggedInUser = req.user; // set by auth middleware
    if (!loggedInUser) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized user",
      });
    }

    const userRole = (loggedInUser.role || "").toLowerCase();

    let userQuery = {};
    let orderQuery = {};

    // 🧩 If sales — filter by referred users
    if (userRole === "sales") {
      const referredUsers = await User.find({
        referalId: loggedInUser._id, // ensure correct spelling
      }).select("_id");

      const referredUserIds = referredUsers.map((u) => u._id);

      if (referredUserIds.length === 0) {
        return res.json({
          success: true,
          message: "No referred users or orders available",
          data: {
            lastUsers: [],
            lastCardOrders: [],
          },
        });
      }

      userQuery = { _id: { $in: referredUserIds } };
      orderQuery = { userId: { $in: referredUserIds } };
    }

    // 🧩 If admin — no filtering applied (auto access to all)
    // No else block needed — admin simply gets all data

    // ❌ If not admin or sales, block access
    if (userRole !== "admin" && userRole !== "sales") {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to view this data",
      });
    }

    // ✅ Fetch both in parallel for performance
    const [lastUsers, lastCardOrders] = await Promise.all([
      User.find(userQuery)
        .sort({ createdAt: -1 })
        .limit(3)
        .select("name email createdAt"),
      CardOrder.find(orderQuery)
        .sort({ createdAt: -1 })
        .limit(3)
        .populate("userId", "name email")
        .select("orderNumber status createdAt"),
    ]);

    return res.json({
      success: true,
      message: "Fetched recent users and orders successfully",
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
      error: error.message,
    });
  }
};



export const getChartDetails = async (req, res) => {
  try {
    const now = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(now.getMonth() - 5);

    const loggedInUser = req.user; // set by auth middleware
    const userRole = (loggedInUser.role || "").toLowerCase();

    let userFilter = {};
    let orderFilter = { createdAt: { $gte: sixMonthsAgo } };

    // 🔹 Role-based filtering
    if (userRole === "admin") {
      // Admin: See all users and orders
      userFilter = { createdAt: { $gte: sixMonthsAgo } };
    } else if (userRole === "sales") {
      // Sales: Only referred users and their orders
      const referredUsers = await User.find({
        referalId: loggedInUser._id,
      }).select("_id");

      const referredUserIds = referredUsers.map((u) => u._id);

      if (referredUserIds.length === 0) {
        return res.json({
          success: true,
          message: "Fetched last 6 months stats",
          data: generateEmptyChartData(),
        });
      }

      userFilter = {
        _id: { $in: referredUserIds },
        createdAt: { $gte: sixMonthsAgo },
      };

      orderFilter = {
        userId: { $in: referredUserIds },
        createdAt: { $gte: sixMonthsAgo },
      };
    } else {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to view chart data",
      });
    }

    // 🔸 Fetch data
    const [cardOrders, users] = await Promise.all([
      CardOrder.find(orderFilter).select("createdAt"),
      User.find(userFilter).select("createdAt"),
    ]);

    // 🔸 Group by month
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

    // 🔸 Generate last 6 months
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
    console.error("Error fetching chart details:", err);
    res.status(500).json({
      success: false,
      message: "Error fetching stats",
      error: err.message,
    });
  }
};

function generateEmptyChartData() {
  const now = new Date();
  const result = [];
  for (let i = 5; i >= 0; i--) {
    const date = new Date();
    date.setMonth(now.getMonth() - i);
    const monthName = date.toLocaleString("default", { month: "long" });
    result.push({ month: monthName, cardOrders: 0, users: 0 });
  }
  return result;
}
