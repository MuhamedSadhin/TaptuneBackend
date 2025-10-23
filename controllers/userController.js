import bcrypt from "bcryptjs";
import User from "../models/userSchema.js";
import Profile from "../models/profileSchema.js";
import Connect from "../models/connectSchema.js";
import CardOrder from "../models/cardOrders.js";


export const getAllUsers = async (req, res) => {
  try {
    const loggedInUser = req.user; // Must be set by auth middleware
    const { page = 1, limit = 10, search = "", salesmanId } = req.query;
    console.log("req.query:", req.query);

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    // Case-insensitive role
    const userRole = (loggedInUser.role || "").toLowerCase();

    // Base search query
    let searchQuery = {
      $or: [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phoneNumber: { $regex: search, $options: "i" } },
      ],
    };

    // Role-based filtering
    if (userRole === "admin") {
      searchQuery.role = "user"; // Admin sees all users

            if (salesmanId) {
              if (salesmanId == "all") {
                // Do nothing, return all users
              } else if (salesmanId == "directLead") {
                // Only direct leads (no salesman assigned)
                searchQuery.referalId = null;
              } else {
                // Filter by specific salesman
                searchQuery.referalId = salesmanId;
              }
            }
      // if salesmanId === "all" => do nothing, return all users
    } else if (userRole === "sales") {
      searchQuery.role = "user";
      searchQuery.referalId = loggedInUser._id; // Sales sees only referred users
    } else {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to view users",
      });
    }

    // Count total users
    const totalUsers = await User.countDocuments(searchQuery);

    // Fetch users with pagination
    const users = await User.find(searchQuery)
      .populate("referalId", "name email") // populate salesman info
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    const totalPages = Math.ceil(totalUsers / limitNum);

    return res.status(200).json({
      success: true,
      message: "Users fetched successfully",
      data: users,
      totalPages,
      currentPage: pageNum,
      totalUsers,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch users",
      error: error.message,
    });
  }
};



export const getAllAdmins = async (req, res) => {
  try {
    const { search, role } = req.query;

    let query = { role: { $ne: "user" } };

    // ✅ role filter
    if (role && role !== "all") {
      query.role = role;
    }

    // ✅ search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } }, // case-insensitive
        { email: { $regex: search, $options: "i" } },
        { phoneNumber: { $regex: search, $options: "i" } },
      ];
    }

    const admins = await User.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: "Admins fetched successfully",
      data: admins,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch admins",
      error: error.message,
    });
  }
};


export const createAdmin = async (req, res) => {
  try {
    const { name, email, password, phoneNumber, role } = req.body;

    // Check for existing user
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, message: "Email already registered." });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    let referalCode = null;

    // 🔹 Generate referral code if role is 'sales'
    if (role && role.toLowerCase() == "sales") {
      const generateCode = () =>
        Array.from({ length: 6 }, () =>
          "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".charAt(
            Math.floor(Math.random() * 36)
          )
        ).join("");

      // Keep generating until a unique one is found
      while (true) {
        const randomCode = generateCode();
        const exists = await User.exists({ referalCode: randomCode });
        if (!exists) {
          referalCode = randomCode;
          break;
        }
      }
    }

    // Create new admin or sales user
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      phoneNumber,
      role,
      referalCode,
      isActive: true,
      isOrdered: false,
    });

    return res.status(201).json({
      success: true,
      message: `${role} created successfully.`,
      data: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        phoneNumber: newUser.phoneNumber,
        role: newUser.role,
        referalCode: newUser.referalCode || null,
        isActive: newUser.isActive,
      },
    });
  } catch (error) {
    console.error("Error creating admin:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};


export const updateAdmin = async (req, res) => {
  try {
    const { id, ...updates } = req.body;

    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "Admin ID is required" });
    }

    const admin = await User.findById(id);
    if (!admin) {
      return res
        .status(404)
        .json({ success: false, message: "Admin not found" });
    }

    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }

    Object.assign(admin, updates);

    await admin.save();

    res.json({ success: true, message: "Admin updated", data: admin });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};


// export const getUserHomepage = async (req, res) => {
//   try {
//     const userId = req.user._id;

//     // Parallel queries
//     const totalProfilesPromise = Profile.countDocuments({ userId });
//     const totalConnectionsPromise = Connect.countDocuments({ userId });
//     const lastProfilesPromise = Profile.find({ userId }).populate("cardOrderId").limit(3);
//     const lastConnectionsPromise = Connect.find({ userId })
//       .sort({ createdAt: -1 })
//       .limit(4);

//     // 👇 Aggregate total profile views for this user
//     const totalProfileViewsPromise = Profile.aggregate([
//       { $match: { userId } },
//       { $group: { _id: null, totalViews: { $sum: "$profileViews" } } },
//     ]);

//     const [
//       totalProfiles,
//       totalConnections,
//       lastProfiles,
//       lastConnections,
//       totalProfileViewsResult,
//     ] = await Promise.all([
//       totalProfilesPromise,
//       totalConnectionsPromise,
//       lastProfilesPromise,
//       lastConnectionsPromise,
//       totalProfileViewsPromise,
//     ]);

//     const totalProfileViews =
//       totalProfileViewsResult.length > 0
//         ? totalProfileViewsResult[0].totalViews
//         : 0;

//     return res.status(200).json({
//       success: true,
//       message: "Homepage data fetched successfully",
//       data: {
//         totalProfiles,
//         totalConnections,
//         totalProfileViews, // ✅ Added total views
//         lastProfiles,
//         lastConnections,
//       },
//     });
//   } catch (error) {
//     console.error("Error fetching homepage data:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Failed to fetch homepage data",
//       error: error.message,
//     });
//   }
// };


export const getUserHomepage = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get all profile IDs of this user
    const userProfiles = await Profile.find({ userId }).select("_id");

    const profileIds = userProfiles.map((p) => p._id);

    // Parallel queries
    const totalProfilesPromise = Profile.countDocuments({ userId });
    const totalConnectionsPromise = Connect.countDocuments({
      profileId: { $in: profileIds },
    });

    const lastProfilesPromise = Profile.find({ userId })
      .populate("cardOrderId")
      .sort({ createdAt: -1 })
      .limit(3);

    const lastConnectionsPromise = Connect.find({
      profileId: { $in: profileIds },
    })
      .populate("profileId", "fullName profileImage cardName") // populate profile info
      .sort({ createdAt: -1 })
      .limit(4);

    // 👇 Aggregate total profile views for this user
    const totalProfileViewsPromise = Profile.aggregate([
      { $match: { userId } },
      { $group: { _id: null, totalViews: { $sum: "$profileViews" } } },
    ]);

    // Execute all in parallel
    const [
      totalProfiles,
      totalConnections,
      lastProfiles,
      lastConnections,
      totalProfileViewsResult,
    ] = await Promise.all([
      totalProfilesPromise,
      totalConnectionsPromise,
      lastProfilesPromise,
      lastConnectionsPromise,
      totalProfileViewsPromise,
    ]);

    const totalProfileViews =
      totalProfileViewsResult.length > 0
        ? totalProfileViewsResult[0].totalViews
        : 0;

    return res.status(200).json({
      success: true,
      message: "Homepage data fetched successfully",
      data: {
        totalProfiles,
        totalConnections,
        totalProfileViews,
        lastProfiles,
        lastConnections,
      },
    });
  } catch (error) {
    console.error("Error fetching homepage data:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch homepage data",
      error: error.message,
    });
  }
};

export const updatePhoneNumber = async (req, res) => {
  try {
    const userId = req.user?._id; 
    const { phoneNumber } = req.body;

    console.log("Received phone number:", req.body);

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized access." });
    }

    if (!phoneNumber) {
      return res.status(400).json({
        message: "Please provide a valid phone number with country code.",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    user.phoneNumber = phoneNumber;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Phone number updated successfully!",
      user: {
        id: user._id,
        phoneNumber: user.phone,
      },
    });
  } catch (error) {
    console.error("Error updating phone:", error);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
};





