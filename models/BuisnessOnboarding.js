import mongoose from "mongoose";

const onboardingSchema = new mongoose.Schema(
  {
    // Step 1
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    businessName: {
      type: String,
      required: true,
      trim: true,
    },
    tagline: {
      type: String,
      trim: true,
    },
    businessType: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: String,
      trim: true,
    },

    mainGoals: {
      type: [String],
      default: [],
    },
    targetAudiences: {
      type: [String],
      default: [],
    },

    industryCategory: {
      type: String,
      trim: true,
    },
    heardAboutTapTune: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const Onboarding = mongoose.model("Onboarding", onboardingSchema);
export default Onboarding;
