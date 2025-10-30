import Onboarding from "../models/BuisnessOnboarding.js";
import User from "../models/userSchema.js";

export const createOnboarding = async (req, res) => {
  try {
    const {
      businessName,
      tagline,
      businessType,
      location,
      mainGoals,
      targetAudiences,
      contactPreferences,
      industryCategory,
      heardAboutTapTune,
    } = req.body;


    const userId = req.user?._id || req.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: User ID is missing.",
      });
    }

    if (!businessName?.trim() || !businessType?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Business name and type are required.",
      });
    }

    const existing = await Onboarding.findOne({ userId });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Onboarding data already exists for this user.",
      });
    }

    const newOnboarding = new Onboarding({
      userId,
      businessName,
      tagline,
      businessType,
      location,
      mainGoals,
      targetAudiences,
      industryCategory,
      heardAboutTapTune,
    });

    await newOnboarding.save();

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        isOnboardingCompleted: true,
        
       },
      { new: true }
    );


    res.status(201).json({
      success: true,
      message: "Onboarding data saved successfully!",
      data: {
        onboarding: newOnboarding,
        user: updatedUser,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error while creating onboarding data.",
      error: error.message,
    });
  }
};
