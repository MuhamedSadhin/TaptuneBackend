import express from "express";
import { getAuthenticatedUser, googleAuth, loginUser, logoutUser, signUp, updateUserSettings } from "../controllers/authController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/login", loginUser);
router.post("/signup", signUp);
router.get("/isAuth",protect,getAuthenticatedUser);
router.post("/updateUserSettings", protect, updateUserSettings);
router.post("/logout", logoutUser);
router.post("/google", googleAuth);
export default router;
