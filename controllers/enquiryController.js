import mongoose from "mongoose";
import Enquiry from "../models/ContactSchema.js";
import notificationSchema from "../models/notificationSchema.js";

export const getEnquiries = async (req, res) => { 
     try {
       const { search = ""} = req.query;

       const query = search
         ? {
             $or: [
               { name: { $regex: search, $options: "i" } },
               { email: { $regex: search, $options: "i" } },
               { phoneNumber: { $regex: search, $options: "i" } },
               { message: { $regex: search, $options: "i" } },
             ],
           }
         : {};

       const enquiries = await Enquiry.find(query)
         .sort({ createdAt: -1 });

       res.json({
         success: true,
         message: "Enquiries fetched successfully",
         data: enquiries,
       });
     } catch (error) {
       console.error("Error fetching enquiries:", error);
       res.status(500).json({
         success: false,
         message: "Server error while fetching enquiries",
       });
     }
}


export const createEnquiry = async (req, res) => {
    try {
      const { name, phoneNumber, email, message } = req.body;
      if (!name && !phoneNumber) {
        return res.status(400).json({
          success: false,
          message: "Name and Phone number is required",
        });
      }

      const enquiry = new Enquiry({
        name,
        phoneNumber,
        email,
        message,
      });

      await enquiry.save();
      
          await notificationSchema.create({
            title: " New Enquiry Received! 📩",
            name,
            email,
            content: `${name} (${
              phoneNumber || "N/A"
            }) has submitted an enquiry.`,
            type: "enquiry",
          });

      res.status(201).json({
        success: true,
        message: "Enquiry created successfully",
        data: enquiry,
      });
    } catch (error) {
      console.error("Error creating enquiry:", error);
      res.status(500).json({
        success: false,
        message: "Server error, please try again later",
      });
    }
}




export const updateEnquiryStatus = async (req, res) => {
  try {
    const { enquiryId, status } = req.body;

    if (!enquiryId || !status) {
      return res.status(400).json({
        success: false,
        message: "enquiryId and status are required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(enquiryId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid enquiry ID",
      });
    }

    const enquiry = await Enquiry.findByIdAndUpdate(
      enquiryId,
      { status },
      { new: true }
    );

    if (!enquiry) {
      return res.status(404).json({
        success: false,
        message: "Enquiry not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Enquiry status updated successfully",
      data: enquiry,
    });
  } catch (error) {
    console.error("Update enquiry status error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update enquiry status",
    });
  }
};