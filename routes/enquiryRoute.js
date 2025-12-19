import express from "express";
import { createEnquiry, getEnquiries, updateEnquiryStatus } from "../controllers/enquiryController.js";
const router = express.Router();


router.get("/getAllEnquiry", getEnquiries);
router.post("/createEnquiry", createEnquiry);
router.post("/updateStatus", updateEnquiryStatus);
export default router;
