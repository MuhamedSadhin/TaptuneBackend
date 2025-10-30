import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { createOrder, verifyPayment } from "../controllers/PaymentController.js";

const router = express.Router();

router.post("/createOrder", createOrder);
router.post("/verifyPayment", verifyPayment);

export default router;
