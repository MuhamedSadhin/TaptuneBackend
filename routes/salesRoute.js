import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { assignUsersToSalesman, getAllSalesman, getAllSalesStats, getSalesmanStats, getUsersWithProfiles } from "../controllers/salesController.js";

const router = express.Router();

router.get("/getSalesStats", getAllSalesStats);
router.post("/getUsersWithProfiles", getUsersWithProfiles);
router.get("/getAllSalesman", getAllSalesman);
router.post("/assignLeadsToSalesman", assignUsersToSalesman);
router.post("/getEachSalesmanStats", getSalesmanStats);
export default router;
