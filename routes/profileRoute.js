import express from "express";
import { editProfile, updateStatusOfProfile, viewAllProfileOfAUser, viewProfileByTap } from "../controllers/profileController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/viewProfilesOfAUser", protect, viewAllProfileOfAUser);
router.get("/viewProfileByTap/:viewId", viewProfileByTap);
router.post("/editProfile", editProfile);
router.post("/updateStatusOfProfile",updateStatusOfProfile);
export default router;
