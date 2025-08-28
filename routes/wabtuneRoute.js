import express from "express";
import { getSubscribers, sendMessage } from "../controllers/wabtuneController.js";


const router = express.Router();


router.post("/sendWabtuneMessage", sendMessage);
router.get("/getSubscribers", getSubscribers);
export default router;
