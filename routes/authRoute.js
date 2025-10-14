import express from "express";
import { createNewPassword, forgotPassword, getAuthenticatedUser, googleAuth, loginUser, logoutUser, signUp, updateUserSettings, verifyOtp } from "../controllers/authController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/login", loginUser);
router.post("/signup", signUp);
router.get("/isAuth",protect,getAuthenticatedUser);
router.post("/updateUserSettings", protect, updateUserSettings);
router.post("/logout", logoutUser);
router.post("/google", googleAuth);




router.post("/forgotPassword", forgotPassword);
router.post("/verifyOtp", verifyOtp);
router.post("/resetPassword", createNewPassword);
export default router;
