import express from "express";
import { createEnquiry, getEnquiries } from "../controllers/enquiryController.js";
const router = express.Router();


router.get("/getAllEnquiry", getEnquiries);
router.post("/createEnquiry", createEnquiry);
export default router;
