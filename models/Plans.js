import mongoose from "mongoose";
const planSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Plan name is required"],
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },  
    profileCount: {
      type: Number,
      required: [true, "Profile count is required"],
      min: [1, "Profile count must be at least 1"],
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
    features: {
      type: [String],
      default: [],
        },
    Duration: {
            type: String,
            required: [true, "Duration is required"],
            trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isTeamManagementIncluded: {
      type: Boolean,
      default: false,
    },
    teamLimit: {
      type: Number,
      default: 0,
    }   
  },
  {
    timestamps: true,
  }
);

planSchema.index({ name: 1 });

const Plan = mongoose.model("Plan", planSchema);
export default Plan;