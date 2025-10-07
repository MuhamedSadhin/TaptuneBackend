import notificationSchema from "../models/notificationSchema.js";

export const getNotifications = async (req, res) => {
  console.log("Fetching notifications for user:", req.user);
  try {
    const loggedInUserId = req.user?.id; 
    const isAdmin = req.user?.role === "admin" || req.user?.role === "Admin"; 
    let query = {};

    if (isAdmin) {
      query = { $or: [{ userId: { $exists: false } }, { userId: null }] };
    } else if (loggedInUserId) {
      query = { userId: loggedInUserId };
    } else {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Please login first.",
      });
    }

    const notifications = await notificationSchema
      .find(query)
      .sort({ createdAt: -1 });

    const count = notifications.length;

    res.status(200).json({
      success: true,
      message: "Notifications fetched successfully",
      data: notifications,
      count,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching notifications",
    });
  }
};

