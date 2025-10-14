import express from "express";
import { createAdmin, getAllAdmins, getAllUsers, getUserHomepage, updateAdmin, updatePhoneNumber } from "../controllers/userController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();


router.get("/getAllUsers", getAllUsers);
router.get("/getAllAdmins", getAllAdmins); 
router.post("/createAdmin", createAdmin); 
router.post("/updateAdmin", updateAdmin); 
router.get("/homePageData", protect, getUserHomepage);
router.post("/updatePhoneNumber", protect, updatePhoneNumber);
export default router;


