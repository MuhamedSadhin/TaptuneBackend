import notificationSchema from "../models/notificationSchema.js";

export const getNotifications = async (req, res) => {
 try {
   const notifications = await notificationSchema
     .find()
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
