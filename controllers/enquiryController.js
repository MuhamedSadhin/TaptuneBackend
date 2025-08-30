import Enquiry from "../models/ContactSchema.js";

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