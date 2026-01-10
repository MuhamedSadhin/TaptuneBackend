import express from "express";
import { createRazorpayOrder, getAllPayments, getPaymentByCardOrderId, sendPaymentLinkManually, verifyRazorpayPayment } from "../controllers/paymentController.js";
import { protect } from "../middlewares/authMiddleware.js";


const router = express.Router();

router.post("/create-order", protect, createRazorpayOrder);
router.post("/verify", verifyRazorpayPayment);
router.post("/sendManualPaymentLink", sendPaymentLinkManually);
router.get("/getAllPayments",protect ,getAllPayments);
router.get("/getOnePayment/:cardOrderId", getPaymentByCardOrderId);
export default router;
