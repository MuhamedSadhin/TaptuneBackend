import CardOrder from "../models/cardOrders.js";
import Profile from "../models/profileSchema.js";

export const viewAllProfileOfAUser = async (req, res) => {
    try {
        const userId = req.user?._id; // assumes you have auth middleware setting req.user

        if (!userId) {
          res.status(401);
          throw new Error("Unauthorized: No user logged in");
        }

        // Find the profile for the logged-in user
        const profile = await Profile.find({ userId })
          .populate({
            path: "cardOrderId", // get the corresponding card order details
            model: CardOrder,
          })
        .lean();

        if (!profile) {
          res.status(404);
          throw new Error("Profile not found for this user");
        }

        res.status(200).json({
          success: true,
          profile,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Server error while fetching profile",
            error: error.message
        });
    }
}
export const viewProfileByTap = async (req, res) => {
  try {
    const { viewId } = req.params;

    const profile = await Profile.findOne({ viewId })
      .populate({
        path: "userId",
        select: "name email role", 
      })
      .lean();

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found",
        status: 404
      });
    }

    if (!profile.isActive) {
      return res.status(403).json({
        success: false,
        message: "Profile not activated",
        data:profile,
        status: 403
      });
    }

    return res.status(200).json({
      success: true,
      data: profile,
      status: 200
    })
  } catch (error) {
    console.error("Error fetching profile by viewId:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching profile",
    });
  }
};


export const editProfile = async (req, res) => {
  console.log("Edit Profile Request:", req.body);
  try {
    const { userId } = req.params;

    const {
      fullName,
      email,
      phoneNumber,
      watsappNumber,
      profilePic,
      banner,
      bio,
      brandName,
      designation,
      locationLink,
      socialMedia,
      status,
      userName, 
      designType,
      _id
    } = req.body;

    if (!fullName) {
      return res.status(400).json({ message: "Full name is required." });
    }

    const updatedProfile = await Profile.findOneAndUpdate(
      { _id },
      {
        fullName,
        email,
        phoneNumber,
        watsappNumber,
        profilePic,
        banner,
        bio,
        brandName,
        designation,
        locationLink,
        socialMedia,
        status,
        userName,
        designType,
      },
      { new: true, runValidators: true }
    );

    if (!updatedProfile) {
      return res.status(404).json({ message: "Profile not found." });
    }

    return res.status(200).json({
      message: "Profile updated successfully",
      profile: updatedProfile,
    });
  } catch (error) {
    console.error("Update profile error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const updateStatusOfProfile = async (req, res) => {
   try {
     const { id, isActive } = req.body;

     console.log(req.body);

     if (!id || typeof isActive !== "boolean") {
       return res.status(400).json({
         success: false,
         message: "Profile ID and isActive (true/false) are required",
       });
     }

     const profile = await Profile.findByIdAndUpdate(
       id,
       { isActive },
       { new: true }
     );

     if (!profile) {
       return res.status(404).json({
         success: false,
         message: "Profile not found",
       });
     }

     return res.status(200).json({
       success: true,
       message: `Profile ${
         isActive ? "activated" : "deactivated"
       } successfully`,
       data: profile,
     });
   } catch (error) {
     console.error("Error updating profile status:", error);
     res.status(500).json({
       success: false,
       message: "Error updating profile status",
       error: error.message,
     });
   }
}

