import express from "express";
import dotenv from "dotenv";
dotenv.config(); 
import cors from "cors";
import morgan from "morgan";
import connectDB from "./config.js/db.js";
// import convertlogic from "./DBLogic/convertLogic.js";
import authRoutes from "./routes/authRoute.js";
import cardRoutes from "./routes/cardRoute.js";
import profileRoutes from "./routes/profileRoute.js";
import cookieParser from "cookie-parser";
import connectionRoutes from "./routes/connectionRoute.js"
import orderRoutes from './routes/orderRoutes.js'
import userRoutes from './routes/userRoute.js';
import enquiryRoutes from "./routes/enquiryRoute.js";
import wabtuneRoutes from "./routes/wabtuneRoute.js";

const app = express();
connectDB();

app.use(
  cors({
    origin:
      ["http://localhost:5173",
      "http://localhost:5174" ,
      "http://localhost:5175",],
    credentials: true,
  })
);
app.use(express.json());
app.use(morgan("dev"));
app.use(cookieParser());
// app.use("/api/convert",convertlogic);
app.use("/api/auth", authRoutes);
app.use("/api/card", cardRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/connection", connectionRoutes);
app.use("/api/order", orderRoutes);
app.use("/api/user", userRoutes);
app.use("/api/enquiry", enquiryRoutes);
app.use("/api/wabtune",wabtuneRoutes)
app.use("/", (req, res) => {
  res.send("API not matching!");
})

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running  on http://localhost:${PORT}`);
});

