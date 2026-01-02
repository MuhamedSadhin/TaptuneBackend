// models/FlowSession.model.js
import mongoose from "mongoose";

const flowSessionSchema = new mongoose.Schema(
  {
    flowToken: {
      type: String,
      required: true,
      index: true,
    },
    whatsappNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

  },
  {
    timestamps: true,
  }
);

flowSessionSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 1800 } 
);

export default mongoose.model("FlowSession", flowSessionSchema);
