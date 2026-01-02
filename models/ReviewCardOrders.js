import mongoose from "mongoose";

const reviewCardOrderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    cardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Card", 
      required: true,
    },

    brandName: {
      type: String,
      required: true,
      trim: true,
    },

    googleReviewUrl: {
      type: String,
      required: true,
      trim: true,
    },

    logo: {
      type: String, // stored file URL
      default: "",
    },

    /* -------- STATUS -------- */
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

/* -------- INDEXES -------- */
reviewCardOrderSchema.index({ userId: 1 });
reviewCardOrderSchema.index({ cardId: 1 });
reviewCardOrderSchema.index({ status: 1 });

const ReviewCardOrder =
  mongoose.models.ReviewCardOrder ||
  mongoose.model("ReviewCardOrder", reviewCardOrderSchema);

export default ReviewCardOrder;
