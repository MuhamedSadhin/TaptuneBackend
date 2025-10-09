import mongoose from "mongoose";
const profileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    cardOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CardOrder",
    },
    viewId: {
      type: String,
      trim: true,
      unique: true,
    },
    profileViews: { type: Number, default: 0 },
    fullName: { type: String, trim: true, required: true },
    userName: { type: String, trim: true, default: "" },
    email: { type: String, trim: true },
    phoneNumber: { type: String, trim: true, default: "" },
    watsappNumber: { type: String, trim: true, default: "" },
    profilePic: { type: String, default: "" },
    banner: { type: String, default: "" },
    bio: { type: String, trim: true, default: "" },
    brandName: { type: String, trim: true, default: "" },
    designation: { type: String, trim: true, default: "" },
    locationLink: { type: String, trim: true, default: "" },
    isActive: { type: Boolean, default: true },
    status: { type: String, trim: true, default: "" },
    designType: { type: String, trim: true, default: "black" },
    socialMedia: [
      {
        platform: { type: String, trim: true },
        link: { type: String, trim: true },
      },
    ],
  },
  { timestamps: true }
);

profileSchema.index({ viewId: 1 });

const Profile =
  mongoose.models.Profile || mongoose.model("Profile", profileSchema);
export default Profile;
