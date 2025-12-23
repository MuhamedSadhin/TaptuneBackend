import express from "express";
import { editProfile, getProfilesCreatedByAdmin, getUserForTransfer, incrementProfileViews, transferProfileToUser, updateStatusOfProfile, viewAllProfileOfAUser, viewProfileByTap } from "../controllers/profileController.js";
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
router.get("/getProfilesCreatedByAdmin", protect,getProfilesCreatedByAdmin);
router.post("/getUserForTransfer", getUserForTransfer);
router.post("/transferProfile", transferProfileToUser);
router.post("/whatsapp-update", updateProfileViaWhatsapp);

export default router;
