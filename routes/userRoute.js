import express from "express";
import { createAdmin, getAllAdmins, getAllUsers, getUserHomepage, updateAdmin } from "../controllers/userController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();


router.get("/getAllUsers", getAllUsers);
router.get("/getAllAdmins", getAllAdmins); 
router.post("/createAdmin", createAdmin); 
router.post("/updateAdmin", updateAdmin); 
router.get("/homePageData",protect, getUserHomepage);
export default router;
