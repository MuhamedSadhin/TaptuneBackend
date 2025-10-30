import mongoose from "mongoose";

const teamSchema = new mongoose.Schema(
  {
    // The user who created or owns this team
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Team name
    name: {
      type: String,
      required: true,
      trim: true,
    },

    // Short description or purpose
    description: {
      type: String,
      trim: true,
    },

    // Team lead (linked to Profile collection)
    teamLead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Profile",
      required: true,
    },

    // Members of the team (array of Profile IDs)
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Profile",
      },
    ],

    // Active or not
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Optional: prevent duplicate team names per user
teamSchema.index({ userId: 1, name: 1 }, { unique: true });

const Team = mongoose.model("Team", teamSchema);
export default Team;
