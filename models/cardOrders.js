import mongoose from "mongoose";

const cardOrderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    profileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Profile",
    },
    cardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Card",
    },
    fullName: { type: String, trim: true },
    designation: { type: String, trim: true },
    phoneNumber: { type: String, trim: true },
    email: {
      type: String,
      trim: true,
    },
    quantity: { type: Number, required: true, min: 1 },
    logoImage: {
      type: String,
      default: "",
    },
    deliveryAddress: {
      houseName: {
        type: String,
        trim: true,
      }, 
      landmark: {
        type: String,
        trim: true,
      }, 
      city: {
        type: String,
        trim: true,
      },
      state: {
        type: String,
        trim: true,
      }, 
      pincode: {
        type: String,
        trim: true,
      },
    },
    status: {
      type: String,
      default: "Pending",
    },
  },
  { timestamps: true }
);



const CardOrder = mongoose.model("CardOrder", cardOrderSchema);
export default CardOrder;
