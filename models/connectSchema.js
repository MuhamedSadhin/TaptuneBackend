import mongoose from "mongoose";

const connectSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    profileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Profile",
    },
    fullName: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    phoneNumber: {
      type: String,
      trim: true,
    },
    designation: {
      type: String,
      trim: true,
    },
    businessName: {
      type: String,
      trim: true,
    },
    businessPhone: {
      type: String,
      trim: true,
    },
    website: {
      type: String,
      trim: true,
      lowercase: true,
    },
    businessCategory: {
      type: String,
      trim: true,
    },
    businessAddress: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    leadLabel: {
      type: String,
      trim: true,
      default: "New",
    }
  },
  { timestamps: true }
);

const Connect = mongoose.model("Connect", connectSchema);

export default Connect;
