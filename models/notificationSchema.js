// models/Notification.js
import mongoose from "mongoose";

const { Schema, model } = mongoose;

const NotificationSchema = new Schema(
  {
    title: {
      type: String,
      trim: true,
    },
    name: {
      type: String,
    },
    email: {
      type: String,
    },
    content: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

export default model("Notification", NotificationSchema);
