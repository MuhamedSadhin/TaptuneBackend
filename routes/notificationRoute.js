import express from "express";
import { getNotifications } from "../controllers/notificationController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/getAllNotifications",protect ,getNotifications);


export default router;
