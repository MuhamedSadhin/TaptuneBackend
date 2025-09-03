import jwt from "jsonwebtoken";
import User from "../models/userSchema.js";

const JWT_SECRET = process.env.JWT_SECRET;

export const profileViewMiddleware = async (req, res, next) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      req.user = null;
      return next();
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error.message);

    req.user = null;
    next();
  }
};
