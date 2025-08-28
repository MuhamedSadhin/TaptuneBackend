import Connect from "../models/connectSchema.js";
import Profile from "../models/profileSchema.js";


export const viewAllConnections = async (req, res) => {
  try {
    const userId = req.user._id;
    const search = (req.body.search || "").trim().toLowerCase();

    // 1. Find all profiles belonging to the user
    const profiles = await Profile.find({ userId }).lean();

    if (!profiles || profiles.length === 0) {
      return res.status(200).json({
        message: "No profiles found for this user",
        data: [],
      });
    }

    const profileIds = profiles.map((profile) => profile._id);

    const connections = await Connect.find({
      profileId: { $in: profileIds },
    }).lean().sort({ createdAt: -1 });

    if (!connections || connections.length === 0) {
      return res.status(200).json({
        message: "No connections found",
        data: [],
      });
    }

    let formattedConnections = connections.map((conn) => {
      const profile = profiles.find(
        (p) => p._id.toString() === conn.profileId.toString()
      );

      return {
        _id: conn._id,
        name: conn.name || "Unknown",
        email: conn.email || "",
        phoneNumber: conn.phoneNumber || "",
        designation: conn.designation || "",
        connectedAt: conn.createdAt || null,
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
    const { viewId, name, email, phoneNumber, designation } = req.body;

    if (!viewId || !name || !email || !phoneNumber || !designation) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Find the profile by viewId
    const profile = await Profile.findOne({ viewId }).lean();

    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    // Create connection (userId comes from profile.userId)
    await Connect.create({
      userId: profile.userId,
      profileId: profile._id,
      name,
      email,
      phoneNumber,
      designation,
    });

    // Return selected profile data to frontend
    const {
      fullName,
      designation: profileDesignation,
      phoneNumber: profilePhone,
      email: profileEmail,
      profilePic,
      brandName,
      socialMedia,
    } = profile;

    return res.status(200).json({
      success: true,
      message: "Connection made successfully",
      data: {
        fullName,
        designation: profileDesignation,
        phoneNumber: profilePhone,
        email: profileEmail,
        profilePic,
        brandName,
        socialMedia,
      },
    });
  } catch (err) {
    console.error("Connect error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};