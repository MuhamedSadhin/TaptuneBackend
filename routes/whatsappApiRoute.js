// routes/whatsapp.routes.js
import express from "express";
import { orderFlowHandler, profileEditWithImage, signUpFlowHandler } from "../controllers/whatsappApi.js";

const router = express.Router();

router.post("/signUpFlow", signUpFlowHandler);
router.post("/profileEditWithImage", profileEditWithImage);
router.post("/cardOrderFlow", orderFlowHandler);
export default router;
