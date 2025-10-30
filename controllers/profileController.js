import mongoose from "mongoose";
import CardOrder from "../models/cardOrders.js";
import Profile from "../models/profileSchema.js";
import User from "../models/userSchema.js";

export const viewAllProfileOfAUser = async (req, res) => {
    try {
        const userId = req.user?._id; 

        if (!userId) {
          res.status(401);
          throw new Error("Unauthorized: No user logged in");
        }

        const profile = await Profile.find({ userId })
          .populate({
            path: "cardOrderId", 
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




export const incrementProfileViews = async (req, res) => {
  try {
    const { id } = req.query;

    const profile = await Profile.findById(id);
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found",
      });
    }

    // 🚫 Skip if owner
    if (req.user && profile.userId.toString() === req.user._id.toString()) {
      return res.status(200).json({
        success: true,
        message: "Own profile view ignored",
      });
    }

    // 🚫 Skip if admin (safe check with optional chaining)
    if (req.user?.role?.toLowerCase() === "admin") {
      return res.status(200).json({
        success: true,
        message: "Admin view ignored",
      });
    }

    // ✅ Increment view
    profile.profileViews += 1;
    await profile.save();

    return res.status(200).json({
      success: true,
      message: "Profile view incremented successfully",
      profile,
    });
  } catch (error) {
    console.error("Error incrementing profile views:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while incrementing profile views",
    });
  }
};


export const getProfilesCreatedByAdmin = async (req, res) => {
  try {
    const loggedInUser = req.user;
    const userRole = (loggedInUser.role || "").toLowerCase();

    let creatorIds = [];

    if (userRole === "admin") {
      const adminsAndSales = await User.find({
        role: { $in: ["Admin", "admin", "Sales", "sales"] },
      }).select("_id");
      creatorIds = adminsAndSales.map((user) => user._id);
    } else if (userRole === "sales") {
      creatorIds = [loggedInUser._id];
    } else {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to view profiles.",
      });
    }

    const profiles = await Profile.find({ userId: { $in: creatorIds } })
      .sort({ createdAt: -1 })
      .lean();

    if (!profiles.length) {
      return res.status(200).json({
        success: false,
        message: "No profiles found for the current user role.",
      });
    }

    return res.status(200).json({
      success: true,
      count: profiles.length,
      data: profiles,
    });
  } catch (error) {
    console.error("Error fetching profiles:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while fetching profiles.",
      error: error.message,
    });
  }
};

export const getUserForTransfer = async (req, res) => {
  try {
    const { email } = req.query;

    if (!email || email.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Email query parameter is required.",
      });
    }

    const users = await User.find({
      email: { $regex: email, $options: "i" },
    }).limit(5);

    // Return empty array instead of 404
    return res.status(200).json({
      success: true,
      message: users.length ? "Users found successfully." : "No users found.",
      data: users, // may be empty
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while fetching user.",
    });
  }
};

export async function transferProfileToUser(req, res) {
  const session = await mongoose.startSession();
  session.startTransaction();

  const { profileId, userId } = req.body;

  try {
    if (!profileId || !userId) {
      return res.status(400).json({
        success: false,
        message: "Profile ID and User ID are required.",
      });
    }

    // Check if user exists
    const user = await User.findById(userId).session(session);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // Find profile
    const profile = await Profile.findById(profileId).session(session);
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found.",
      });
    }
    const cardOrder = await CardOrder.findById(profile.cardOrderId).session(session);

    if (!cardOrder) {
      return res.status(404).json({
        success: false,
        message: "Associated Card Order not found.",
      });
    }
     
    cardOrder.userId = userId;
    await cardOrder.save({ session });

    // Update profile's userId
    profile.userId = userId;
    await profile.save({ session });

    // Update user's isOrdered
    user.isOrdered = true;
    await user.save({ session });

    // Commit transaction
    await session.commitTransaction();
    session.endSession();



    // Send success response
    return res.status(200).json({
      success: true,
      message: "Profile user transferred successfully.",
      profile,
      user,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Transfer profile transaction error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error.",
      error: error.message || error,
    });
  }
}