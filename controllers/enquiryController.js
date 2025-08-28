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