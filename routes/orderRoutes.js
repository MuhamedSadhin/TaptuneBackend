import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { getAllOrders, getChartDetails, getOrderAndUserForAdminHomePage, getOrderStats, getStatsForAdmin } from "../controllers/orderController.js";

const router = express.Router();


router.get("/getAllOrders", protect,getAllOrders);
router.get("/getOrderStatistics",protect ,getOrderStats);
router.get("/adminStats",protect,getStatsForAdmin);
router.get("/getAdminAndUserForAdminHomePage",protect, getOrderAndUserForAdminHomePage);
router.get("/getChartData", protect,getChartDetails);

export default router;
