import express from "express";
import { getSubscribers, sendMessage, updateProfileViaWhatsapp, verifyWhatsappWebhook, whatsappWebhookHandler } from "../controllers/wabtuneController.js";


const router = express.Router();
router.use(express.json());

router.post("/sendWabtuneMessage", sendMessage);
router.get("/getSubscribers", getSubscribers);
router.post("/profile/whatsapp-update", updateProfileViaWhatsapp);

router.get("/webhook", verifyWhatsappWebhook);
router.post("/webhook", whatsappWebhookHandler);

export default router;
