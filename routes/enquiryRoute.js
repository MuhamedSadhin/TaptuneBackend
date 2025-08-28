import express from "express";
import { getEnquiries } from "../controllers/enquiryController.js";
const router = express.Router();


router.get("/getAllEnquiry", getEnquiries);

export default router;
