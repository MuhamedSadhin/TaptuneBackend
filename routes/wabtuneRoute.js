import express from "express";
import { getSubscribers, sendMessage, updateProfileViaWhatsapp } from "../controllers/wabtuneController.js";


const router = express.Router();


router.post("/sendWabtuneMessage", sendMessage);
router.get("/getSubscribers", getSubscribers);
router.post("/profile/whatsapp-update", updateProfileViaWhatsapp);
export default router;
