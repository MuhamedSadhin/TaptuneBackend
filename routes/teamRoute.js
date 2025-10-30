import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { createTeam, editTeam, fetchProfilesForTeamCreation, getUserTeams } from "../controllers/teamController.js";

const router = express.Router();

router.get("/getAllTeam", protect, getUserTeams);
router.get(
  "/fetchProfilesForTeamCreation",
  protect,
  fetchProfilesForTeamCreation
);
router.post("/createTeam", protect, createTeam);
router.post("/editTeam", protect, editTeam);
export default router;
