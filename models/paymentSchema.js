import mongoose from "mongoose";

const PaymentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    cardOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CardOrder",
      default: null,
      index: true,
    },
    isReviewCard: {
      type: Boolean,
      default: false,
      index: true,
    },
    reviewCardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ReviewCard",
      default: null,
      index: true,
    },
    attempt: {
      type: Number,
      default: 1,
      min: 1,
    },
    razorpayOrderId: {
      type: String,
      required: true,
      index: true,
    },
    razorpayPaymentId: {
      type: String,
      default: null,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    status: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded", "partial_refund"],
      default: "pending",
      index: true,
    },
    paymentLink: {
      type: String,
      trim: true,
    },
    customerPhone: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }  
);


PaymentSchema.index({ razorpayOrderId: 1, attempt: 1 }, { unique: true });
export default mongoose.model("Payment", PaymentSchema);
