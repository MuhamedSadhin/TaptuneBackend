import express from "express";
import { editProfile, incrementProfileViews, updateStatusOfProfile, viewAllProfileOfAUser, viewProfileByTap } from "../controllers/profileController.js";
import { protect } from "../middlewares/authMiddleware.js";
import { profileViewMiddleware } from "../middlewares/profileViewMiddleware.js";

const router = express.Router();

router.get("/viewProfilesOfAUser", protect, viewAllProfileOfAUser);
router.get("/viewProfileByTap/:viewId", viewProfileByTap);
router.post("/editProfile", editProfile);
router.post("/updateStatusOfProfile", updateStatusOfProfile);
router.post(
  "/incrementProfileView",
  profileViewMiddleware,
  incrementProfileViews
);
export default router;
