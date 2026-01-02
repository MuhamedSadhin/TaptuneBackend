import mongoose from "mongoose";
import Connect from "../models/connectSchema.js";
import Profile from "../models/profileSchema.js";
import notificationSchema from "../models/notificationSchema.js";
import { sendWelcomeTemplate } from "../utils/sendWhatsTempMessages.js";
import User from "../models/userSchema.js";


export const viewAllConnections = async (req, res) => {
  try {
    const userId = req.user._id;

    const { profileId, leadlabel, search: rawSearch } = req.body;
    const search = (rawSearch || "").trim().toLowerCase();

    const profileFilter = { userId };
    if (profileId) {
      profileFilter._id = profileId;
    }

    const profiles = await Profile.find(profileFilter).lean();

    if (!profiles || profiles.length === 0) {
      return res.status(200).json({
        message: "No profiles found matching your criteria.",
        data: [],
      });
    }

    const profileIds = profiles.map((p) => p._id);
    const connectionFilter = {
      profileId: { $in: profileIds },
    };
    if (leadlabel) {
      connectionFilter.leadLabel = leadlabel;
    }

    const connections = await Connect.find(connectionFilter)
      .lean()
      .sort({ createdAt: -1 });

    if (!connections || connections.length === 0) {
      return res.status(200).json({
        message: "No connections found matching your criteria.",
        data: [],
      });
    }

    let formattedConnections = connections.map((conn) => {
      const profile = profiles.find(
        (p) => p._id.toString() === conn.profileId.toString()
      );
      return {
        _id: conn._id,
        name: conn.fullName || "Unknown",
        email: conn.email || "",
        phoneNumber: conn.phoneNumber || "",
        designation: conn.designation || "",
        businessName: conn.businessName || "",
        businessPhone: conn.businessPhone || "",
        website: conn.website || "",
        businessCategory: conn.businessCategory || "",
        businessAddress: conn.businessAddress || "",
        notes: conn.notes || "",
        connectedAt: conn.createdAt || new Date(),
        leadLabel: conn.leadLabel || "New",
        profileId: conn.profileId,
        viewId: profile?.viewId || "",
        profileName: profile?.fullName || "",
        profilePic: profile?.profilePic || "",
        brandName: profile?.brandName || "",
      };
    });

    if (search) {
      formattedConnections = formattedConnections.filter((conn) => {
        return (
          conn.name.toLowerCase().includes(search) ||
          conn.email.toLowerCase().includes(search) ||
          conn.phoneNumber.toLowerCase().includes(search) ||
          conn.designation.toLowerCase().includes(search)
        );
      });
    }

    return res.status(200).json({
      message: "Connections fetched successfully",
      data: formattedConnections,
    });
  } catch (error) {
    console.error("Error fetching connections:", error);
    return res.status(500).json({
      message: "Server error fetching connections",
      error: error.message,
    });
  }
};





export const makeConnection = async (req, res) => {
  try {
    const {
      viewId,
      fullName,
      email,
      phoneNumber,
      designation,
      businessName,
      businessPhone,
      website,
      businessCategory,
      businessAddress,
      notes,
    } = req.body;

    console.log("Request Body Received:", req.body);

    if (!viewId || !fullName || !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "viewId, fullName, and phoneNumber are required.",
      });
    }

    /* --------------------------------------------------
       1️⃣ FIND PROFILE
    -------------------------------------------------- */
    const profile = await Profile.findOne(
      { viewId },
      { userId: 1, fullName: 1, email: 1, phoneNumber: 1 }
    ).lean();

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found. The link or QR code may be invalid.",
      });
    }

    /* --------------------------------------------------
       2️⃣ FIND USER (ROLE SOURCE)
    -------------------------------------------------- */
    const user = await User.findById(profile.userId, { role: 1 }).lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found for this profile",
      });
    }

    /* --------------------------------------------------
       3️⃣ CREATE CONNECTION
    -------------------------------------------------- */
    const newConnection = await Connect.create({
      userId: profile.userId,
      profileId: profile._id,
      fullName,
      email,
      phoneNumber,
      designation,
      businessName,
      businessPhone,
      website,
      businessCategory,
      businessAddress,
      notes,
    });

    /* --------------------------------------------------
       4️⃣ CREATE NOTIFICATION
    -------------------------------------------------- */
    await notificationSchema.create({
      title: "New Connection Made!",
      name: fullName,
      email,
      userId: profile.userId,
      content: `${fullName} (${
        email || phoneNumber
      }) has connected with your profile.`,
      type: "connection",
      relatedId: newConnection._id,
    });

    /* --------------------------------------------------
       5️⃣ SEND WHATSAPP (ROLE CHECK FROM USER)
    -------------------------------------------------- */
    const allowedRoles = ["sales", "admin"];
    console.log("user role:", user.role);

    if (allowedRoles.includes(user.role)) {
      await sendWelcomeTemplate({
        to: phoneNumber,
        firstName: fullName,
      });
    }

    /* --------------------------------------------------
       6️⃣ RESPONSE
    -------------------------------------------------- */
    return res.status(201).json({
      success: true,
      message: "Connection made successfully",
      data: {
        connectionDetails: newConnection,
        profileDetails: {
          fullName: profile.fullName,
          ...(profile.email && { email: profile.email }),
          ...(profile.phoneNumber && { phoneNumber: profile.phoneNumber }),
        },
      },
    });
  } catch (err) {
    console.error("Connect error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};









export const updateConnectionLabel = async (req, res) => {
  try {
    const { connectionId } = req.query;
    const { label } = req.body;

    console.log("label", label);
    console.log("connectionId", connectionId);

    if (label === undefined) {
      return res.status(400).json({
        success: false,
        message: "The 'label' field is required in the request body.",
      });
    }

    const updatedConnection = await Connect.findByIdAndUpdate(
      connectionId,
      { leadLabel: label },
      { new: true }
    );

    if (!updatedConnection) {
      return res.status(404).json({
        success: false,
        message: "Connection not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Connection label updated successfully.",
      data: updatedConnection,
    });
  } catch (err) {
    console.error("Update Label Error:", err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};