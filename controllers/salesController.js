import CardOrder from "../models/cardOrders.js";
import Profile from "../models/profileSchema.js";
import User from "../models/userSchema.js";


export const getAllSalesStats = async (req, res) => {
  try {
    const salesmen = await User.find({ role: "sales" }).select(
      "_id name email phoneNumber"
    );

    // Get admin details
    const admin = await User.findOne({ role: "Admin" }).select(
      "_id name email phoneNumber"
    );

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // 🔹 Calculate stats for all salesmen in parallel
    const salesmanStats = await Promise.all(
      salesmen.map(async (salesman) => {
        const referredUsers = await User.find({
          referalId: salesman._id,
        }).select("_id createdAt");
        const referredUserIds = referredUsers.map((u) => u._id);

        const totalReferrals = referredUsers.length;
        const monthlyReferrals = referredUsers.filter(
          (u) => u.createdAt >= startOfMonth && u.createdAt <= endOfMonth
        ).length;

        const [totalConfirmed, totalPending] = await Promise.all([
          CardOrder.countDocuments({
            userId: { $in: referredUserIds },
            status: { $regex: /^confirmed$/i },
          }),
          CardOrder.countDocuments({
            userId: { $in: referredUserIds },
            status: { $regex: /^pending$/i },
          }),
        ]);

        return {
          salesmanId: salesman._id,
          name: salesman.name,
          email: salesman.email,
          phoneNumber: salesman.phoneNumber,
          totalReferrals,
          monthlyReferrals,
          totalConfirmed,
          totalPending,
        };
      })
    );

    // 🔹 Add "Direct Leads" group (users without referrals)
    const usersWithoutReferrals = await User.find({
      $or: [{ referalId: { $exists: false } }, { referalId: null }],
    }).select("_id createdAt");

    const usersWithoutIds = usersWithoutReferrals.map((u) => u._id);
    const totalReferralsWithout = usersWithoutReferrals.length;
    const monthlyReferralsWithout = usersWithoutReferrals.filter(
      (u) => u.createdAt >= startOfMonth && u.createdAt <= endOfMonth
    ).length;

    const [totalConfirmedWithout, totalPendingWithout] = await Promise.all([
      CardOrder.countDocuments({
        userId: { $in: usersWithoutIds },
        status: { $regex: /^confirmed$/i },
      }),
      CardOrder.countDocuments({
        userId: { $in: usersWithoutIds },
        status: { $regex: /^pending$/i },
      }),
    ]);

    const directLeads = {
      salesmanId: admin?._id || null,
      name: "Direct Leads",
      email: admin?.email || "N/A",
      phoneNumber: admin?.phoneNumber || "N/A",
      totalReferrals: totalReferralsWithout,
      monthlyReferrals: monthlyReferralsWithout,
      totalConfirmed: totalConfirmedWithout,
      totalPending: totalPendingWithout,
    };

    // 🔹 Sort salesmen by totalConfirmed (Direct Leads will be added last)
    salesmanStats.sort((a, b) => b.totalConfirmed - a.totalConfirmed);

    // 🔹 Combine all stats
    const results = [...salesmanStats, directLeads];

    return res.status(200).json({
      success: true,
      count: results.length,
      data: results,
    });
  } catch (error) {
    console.error("Error fetching sales stats:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error. Could not fetch sales data.",
    });
  }
};



export const getUsersWithProfiles = async (req, res) => {
  try {
    const {
      salesmanId,
      search,
      accountType,
      isActive,
      page = 1,
      limit = 10,
    } = req.body;

    if (!salesmanId) {
      return res.status(400).json({ message: "Salesman ID is required." });
    }

    const adminUser = await User.findById(salesmanId).select("role").lean();
    if (!adminUser) {
      return res.status(404).json({ message: "Invalid Salesman/Admin ID" });
    }

    // Base query for users under this salesman/admin
    const baseQuery =
      adminUser.role !== "Admin" ? { referalId: salesmanId } : {};

    // ------------------- TABLE FILTERS -------------------
    let userQuery = { ...baseQuery };

    // Account type filtering
    if (!accountType || accountType.toLowerCase() === "all") {
      // do nothing, include all
    } else if (accountType.toLowerCase() === "personal") {
      userQuery.$or = [
        { accountType: "personal" },
        { accountType: { $exists: false } },
        { accountType: null },
      ];
    } else if (accountType.toLowerCase() === "business") {
      userQuery.accountType = "business";
    }

    // Active status filter
    if (isActive !== undefined && isActive !== "all") {
      userQuery.isActive = isActive === "true";
    }

    // Search filter
    if (search && search.trim() !== "") {
      const searchRegex = new RegExp(search.trim(), "i");
      userQuery.$or = userQuery.$or
        ? [
            ...userQuery.$or,
            { name: { $regex: searchRegex } },
            { email: { $regex: searchRegex } },
            { phoneNumber: { $regex: searchRegex } },
          ]
        : [
            { name: { $regex: searchRegex } },
            { email: { $regex: searchRegex } },
            { phoneNumber: { $regex: searchRegex } },
          ];
    }

    const skip = (page - 1) * limit;

    // Fetch users with pagination
    const users = await User.find(userQuery)
      .select(
        "name email phoneNumber role accountType isOrdered isActive createdAt"
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const filteredTotal = await User.countDocuments(userQuery);

    // Fetch profiles for current page users
    const userIds = users.map((u) => u._id);
    let profileQuery = { userId: { $in: userIds } };
    if (search && search.trim() !== "") {
      const searchRegex = new RegExp(search.trim(), "i");
      profileQuery.$or = [
        { fullName: { $regex: searchRegex } },
        { email: { $regex: searchRegex } },
        { phoneNumber: { $regex: searchRegex } },
      ];
    }

    const profiles = await Profile.find(profileQuery)
      .select(
        "userId fullName email phoneNumber profilePic status designation isActive viewId"
      )
      .lean();

    // Merge users with profiles
    const usersWithProfiles = users.map((user) => {
      const profile = profiles.find(
        (p) => p.userId.toString() === user._id.toString()
      );
      return { ...user, profile: profile || null };
    });

    // ------------------- RESPONSE -------------------
    res.status(200).json({
      success: true,
      data: usersWithProfiles,
      total: filteredTotal,
      page,
      limit,
    });
  } catch (error) {
    console.error("Error fetching users with profiles:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};


export const getAllSalesman = async (req, res) => {
  try {
    // Fetch only active salesmen
    const salesmen = await User.find({ role: "sales", isActive: true })
      .select("_id name email phoneNumber isActive createdAt")
      .sort({ createdAt: -1 });

    if (!salesmen.length) {
      return res.status(404).json({
        success: false,
        message: "No active salesmen found",
      });
    }

    res.status(200).json({
      success: true,
      count: salesmen.length,
      data: salesmen,
    });
  } catch (error) {
    console.error("Error fetching salesmen:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching salesmen",
      error: error.message,
    });
  }
};


export const assignUsersToSalesman = async (req, res) => {
  try {
    const { salesmanId, userIds, isDirectLead } = req.body;


    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "User IDs array is required.",
      });
    }

    if (isDirectLead) {
      await User.updateMany(
        { _id: { $in: userIds } },
        { $unset: { referalId: "" } }
      );

      return res.status(200).json({
        success: true,
        message: "Users marked as direct leads and referral IDs removed.",
      });
    }

    if (!salesmanId) {
      return res.status(400).json({
        success: false,
        message: "Salesman ID is required when not direct lead.",
      });
    }

    await User.updateMany(
      { _id: { $in: userIds } },
      { $set: { referalId: salesmanId } }
    );

    return res.status(200).json({
      success: true,
      message: "Users successfully assigned to salesman.",
    });
  } catch (error) {
    console.error("Error assigning users to salesman:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
      error: error.message,
    });
  }
};




export const getSalesmanStats = async (req, res) => {
  try {
    const { salesmanId } = req.body;

    if (!salesmanId) {
      return res.status(400).json({
        success: false,
        message: "salesmanId is required in request body",
      });
    }

    // Fetch salesman/admin user
    const salesman = await User.findById(salesmanId).select("role");

    if (!salesman) {
      return res.status(404).json({
        success: false,
        message: "Salesman not found",
      });
    }

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    let userFilter = {};

    // 🟣 If Admin → Include users without referalId (Direct Leads)
    if (salesman.role?.toLowerCase() === "admin") {
      userFilter = {
        $or: [{ referalId: { $exists: false } }, { referalId: null }],
      };
    }
    // 🟢 Else (Normal Salesman) → Include only his referred users
    else {
      userFilter = { referalId: salesmanId };
    }

    // Find all users based on filter
    const users = await User.find(userFilter).select("_id");
    const userIds = users.map((u) => u._id);

    // Total users
    const totalUsers = userIds.length;

    // Total profiles for these users
    const totalProfiles = await Profile.countDocuments({
      userId: { $in: userIds },
    });

    // Users created this month
    const usersThisMonth = await User.countDocuments({
      ...userFilter,
      createdAt: { $gte: startOfMonth },
    });

    // Pending orders for these users
    const pendingOrders = await CardOrder.countDocuments({
      userId: { $in: userIds },
      status: "Pending",
    });

    return res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalProfiles,
        usersThisMonth,
        pendingOrders,
      },
    });
  } catch (error) {
    console.error("Error fetching salesman stats:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch salesman stats",
      error: error.message,
    });
  }
};