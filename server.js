import express from "express";
import dotenv from "dotenv";
dotenv.config();
import cors from "cors";
import morgan from "morgan";
import authRoutes from "./routes/authRoute.js";
import cardRoutes from "./routes/cardRoute.js";
import profileRoutes from "./routes/profileRoute.js";
import cookieParser from "cookie-parser";
import connectionRoutes from "./routes/connectionRoute.js"
import orderRoutes from './routes/orderRoutes.js'
import userRoutes from './routes/userRoute.js';
import enquiryRoutes from "./routes/enquiryRoute.js";
import wabtuneRoutes from "./routes/wabtuneRoute.js";
import connectDB from "./config/db.js";

const app = express();
connectDB();
app.use(cookieParser());

const corsOptions = {
  origin: true, 
  credentials: true, 
};

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const allowedOrigins = [
  process.env.FRONTEND_URL?.trim().replace(/\/$/, ""),
  process.env.FRONTND_URL2?.trim().replace(/\/$/, ""),
  "https://taptune-frontend.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000",
];
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);



app.use(morgan("dev"));
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running  on http://localhost:${PORT}`);
});



