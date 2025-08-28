import express from "express";
import { createCard, orderCardAndCreateProfile, toggleCardStatusIsActive, updateCard, updateCardOrderStatus, viewAllCards, viewOneCard } from "../controllers/cardController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/viewAllCard",protect, viewAllCards);
router.get("/viewOneCard/:id", viewOneCard);
router.post("/orderCardAndCreateProfile", protect, orderCardAndCreateProfile);
router.post("/updateCard", updateCard);
router.post("/createCard", createCard);
router.post("/updateOrderStatus", updateCardOrderStatus);
router.post("/updateCardStatusIsActive", toggleCardStatusIsActive);

export default router;
