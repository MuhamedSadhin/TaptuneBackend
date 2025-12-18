import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import {createReviewCardOrder, getAllReviewCardOrders, updateReviewCardOrderStatus} from '../controllers/reviewCardController.js'
const router = express.Router();

router.post("/", protect, createReviewCardOrder);             
router.post("/status", protect, updateReviewCardOrderStatus);
router.get("/", protect, getAllReviewCardOrders);


export default router;
