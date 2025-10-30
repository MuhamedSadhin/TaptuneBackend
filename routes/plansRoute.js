import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { createPlan, getPlanById, getPlans } from "../controllers/planController.js";

const router = express.Router();

router.post("/createPlans", protect,createPlan);
router.get("/getPlans", getPlans);
router.post("/getPlanById", getPlanById);
export default router;
