import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { makeConnection, viewAllConnections } from "../controllers/connectionController.js";

const router = express.Router();

router.post("/viewAllConnections", protect, viewAllConnections);
router.post("/makeConnection", makeConnection);

export default router;
