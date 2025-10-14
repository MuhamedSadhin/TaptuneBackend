import express from "express";
import { createOnboarding } from "../controllers/onboardingController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/onboardingAnswers", protect,createOnboarding);

export default router;
