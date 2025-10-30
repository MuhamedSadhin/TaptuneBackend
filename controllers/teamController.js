import mongoose from "mongoose";
import BusinessSubscription from "../models/BuisnessSubsciptionSchema.js";
import CardOrder from "../models/cardOrders.js";
import Profile from "../models/profileSchema.js";
import Team from "../models/teamSchema.js";


export const getUserTeams = async (req, res) => {
  try {
      const userId = req.user._id;   
    const teams = await Team.find({ userId })
      .populate("teamLead", "fullName email designation")
      .populate("members", "fullName email designation")
      .sort({ createdAt: -1 }); 

    return res.status(200).json({
      success: true,
      count: teams.length,
      teams,
    });
  } catch (error) {
    console.error("Error fetching teams:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch teams",
      error: error.message,
    });
  }
};


export const fetchProfilesForTeamCreation = async (req, res) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: No user logged in",
      });
    }

    const teams = await Team.find({ userId })
      .select("members teamLead")
      .lean();

    const usedProfileIds = new Set();
    teams.forEach((team) => {
      if (team.teamLead) usedProfileIds.add(team.teamLead.toString());
      team.members?.forEach((member) => usedProfileIds.add(member.toString()));
    });

    const profiles = await Profile.find({
      userId,
      _id: { $nin: Array.from(usedProfileIds) },
    })
      .populate({
        path: "cardOrderId",
        model: CardOrder,
      })
      .lean();

    if (!profiles || profiles.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        profiles: [],
        message: "No available profiles found for team creation",
      });
    }

    res.status(200).json({
      success: true,
      count: profiles.length,
      profiles,
    });
  } catch (error) {
    console.error("Error fetching profiles for team creation:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching profiles for team creation",
      error: error.message,
    });
  }
};


export const createTeam = async (req, res) => {
  try {
    const userId = req.user._id; // ✅ userId from auth middleware
      const { name, description, members, teamLead } = req.body;
      console.log("create team req.body:", req.body);

    // ✅ Validate basic fields
    if (!name?.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Team name is required." });
    }
    if (!teamLead) {
      return res
        .status(400)
        .json({ success: false, message: "Please select a team lead." });
    }
    if (!members.includes(teamLead)) {
      return res.status(400).json({
        success: false,
        message: "Team lead must be one of the team members.",
      });
      }
      

    const activeSubscription = await BusinessSubscription.findOne({
      userId,
    }).populate("planId");

    if (!activeSubscription || !activeSubscription.planId) {
      return res.status(403).json({
        success: false,
        message: "You must have an active subscription to create a team.",
      });
    }

    const plan = activeSubscription.planId;

    // ✅ Check if plan supports team management
    if (!plan.isTeamManagementIncluded) {
      return res.status(403).json({
        success: false,
        message: "Your current plan does not include team management.",
      });
    }

    // ✅ Check user's current team count
    const existingTeamsCount = await Team.countDocuments({ userId });
    if (existingTeamsCount >= plan.teamLimit) {
      return res.status(403).json({
        success: false,
        message: `You have reached your team limit (${plan.teamLimit}) for your current plan.`,
      });
    }

    const conflictTeams = await Team.find({
      members: { $in: members.map((id) => new mongoose.Types.ObjectId(id)) },
    }).select("name members");

    if (conflictTeams.length > 0) {
      const conflictMemberIds = conflictTeams.flatMap((team) => team.members);
      const duplicateMembers = members.filter((id) =>
        conflictMemberIds.includes(id)
      );

      return res.status(400).json({
        success: false,
        message: "Some members are already part of another team.",
        duplicateMembers,
      });
    }

    // ✅ Create the new team
    const newTeam = await Team.create({
      userId,
      name: name.trim(),
      description: description?.trim() || "",
      teamLead,
      members,
    });

    return res.status(201).json({
      success: true,
      message: "Team created successfully.",
      team: newTeam,
    });
  } catch (error) {
    console.error("❌ Error creating team:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while creating the team.",
      error: error.message,
    });
  }
};

export const editTeam = async (req, res) => {
  try {
    const userId = req.user?._id;
    const { id, name, description, teamLead, members = [] } = req.body;

    console.log("Edit team req.body:", req.body);

    if (!name || !teamLead) {
      return res.status(400).json({
        success: false,
        message: "Team name and team lead are required.",
      });
    }

    const team = await Team.findById(id);
    if (!team) {
      return res.status(404).json({
        success: false,
        message: "Team not found.",
      });
    }

    if (team.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to edit this team.",
      });
    }

    // Clean up members array (remove duplicates, falsy values)
    let uniqueMembers = [...new Set(members.filter(Boolean))];

    // Case 1: If only one member is given, make that person both lead and member
    if (uniqueMembers.length === 1) {
      team.teamLead = uniqueMembers[0];
      uniqueMembers = [uniqueMembers[0]];
    } else {
      // Case 2: Ensure teamLead is always in members list
      if (!uniqueMembers.includes(teamLead)) {
        uniqueMembers.push(teamLead);
      }
      team.teamLead = teamLead;
    }

    team.name = name.trim();
    team.description = description?.trim() || "";
    team.members = uniqueMembers;

    const updatedTeam = await team.save();

    const populatedTeam = await Team.findById(updatedTeam._id)
      .populate("teamLead", "brandName designation profileImage")
      .populate("members", "brandName designation profileImage");

    res.status(200).json({
      success: true,
      message: "Team updated successfully.",
      team: populatedTeam,
    });
  } catch (error) {
    console.error("Error updating team:", error);
    res.status(500).json({
      success: false,
      message: "Server error. Could not update team.",
      error: error.message,
    });
  }
};
