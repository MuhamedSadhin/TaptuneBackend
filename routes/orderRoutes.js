import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { getAllOrders, getChartDetails, getOrderAndUserForAdminHomePage, getOrderStats, getStatsForAdmin } from "../controllers/orderController.js";

const router = express.Router();


router.get("/getAllOrders", protect,getAllOrders);
router.get("/getOrderStatistics",protect ,getOrderStats);
router.get("/adminStats", getStatsForAdmin);
router.get("/getAdminAndUserForAdminHomePage", getOrderAndUserForAdminHomePage);
router.get("/getChartData", getChartDetails);

export default router;
