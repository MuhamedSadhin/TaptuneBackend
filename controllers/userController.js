import bcrypt from "bcryptjs";
import User from "../models/userSchema.js";
import Profile from "../models/profileSchema.js";
import Connect from "../models/connectSchema.js";

export const getAllUsers = async (req, res) => {

  try {
    const { page = 1, limit = 10, search = "" } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const searchQuery = {
      role: "user",
      $or: [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phoneNumber: { $regex: search, $options: "i" } },
      ],
    };

    const totalUsers = await User.countDocuments(searchQuery);

    const users = await User.find(searchQuery)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    const totalPages = Math.ceil(totalUsers / limitNum);

    res.status(200).json({
      success: true,
      message: "Users fetched successfully",
      data: users,
      totalPages,
      currentPage: pageNum,
    });
  } catch (error) {
    res.status(500).json({
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

    // Role must NOT be "user"
    if (!role || role === "user") {
      return res
        .status(400)
        .json({
          success: false,
          message: "Invalid role. Role must be admin or another type.",
        });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, message: "Email already registered." });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newAdmin = await User.create({
      name,
      email,
      password: hashedPassword,
      phoneNumber,
      role,
      isActive: true,
      isOrdered: false,
    });

    return res.status(201).json({
      success: true,
      message: "Admin created successfully",
      data: {
        id: newAdmin._id,
        name: newAdmin.name,
        email: newAdmin.email,
        phoneNumber: newAdmin.phoneNumber,
        role: newAdmin.role,
        isActive: newAdmin.isActive,
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


export const getUserHomepage = async (req, res) => {
  try {
    const userId = req.user._id;

    const totalProfilesPromise = Profile.countDocuments({ userId });
    const totalConnectionsPromise = Connect.countDocuments({ userId });
    const lastProfilesPromise = Profile.find({ userId })
      .limit(3);

    // Last 4 connections
    const lastConnectionsPromise = Connect.find({ userId })
      .sort({ createdAt: -1 })
      .limit(4);
    
    const [totalProfiles, totalConnections, lastProfiles, lastConnections] =
      await Promise.all([
        totalProfilesPromise,
        totalConnectionsPromise,
        lastProfilesPromise,
        lastConnectionsPromise,
      ]);

    return res.status(200).json({
      success: true,
      message: "Homepage data fetched successfully",
      data: {
        totalProfiles,
        totalConnections,
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