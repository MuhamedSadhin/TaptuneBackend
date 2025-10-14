import User from "../models/userSchema.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { sendWhatsAppTemplateMessage } from "../utils/sendWabtuneMessage.js";
import axios from "axios";
import dotenv from "dotenv";
import notificationSchema from "../models/notificationSchema.js";
import { sendEmail } from "../utils/SendEmail.js";
import { oauth2Client } from "../utils/googleClient.js";
dotenv.config();



const JWT_SECRET = process.env.JWT_SECRET;

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    if (!user.password || user.password == "") {
      return res.status(401).json({
        success: false,
        message:
          "This account was created with Google. Please log in with Google or set a password.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, {
      expiresIn: "7d",
    });

    // res.cookie("token", token, {
    //   httpOnly: true,
    //   secure: process.env.NODE_ENV === "production",
    //   sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    //   maxAge: 7 * 24 * 60 * 60 * 1000,
    // });

    const isProduction = process.env.NODE_ENV === "production";

    res.cookie("token", token, {
      httpOnly: true, 
      secure: isProduction, 
      sameSite: isProduction ? "None" : "lax", 
      maxAge: 7 * 24 * 60 * 60 * 1000, 
      path: "/", 
    });

    res.status(200).json({
      success: true,
      message: "Login successful",
      user: {
        id: user._id,
        name: user.name,
        phoneNumber: user.phoneNumber,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        accountType: user.accountType,
        isOnboardingCompleted: user.isOnboardingCompleted,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const signUp = async (req, res) => {
  try {
    const { name, email, password, phoneNumber, accountType } = req.body;
    console.log("signup", req.body);


    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and password are required.",
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User with this email already exists.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      phoneNumber,
      role: "user",
      isOrdered: false,
      isActive: true,
      accountType: accountType || "personal",
      isOnboardingCompleted: false,
    });

    await newUser.save();

    await notificationSchema.create({
      title: "New Member Joined! 👋",
      name: newUser.name,
      email: newUser.email,
      content: `${newUser.name}  -  (${newUser.email}) has created an account.`,
    });

    let whatsappResponse = null;
    
if (phoneNumber) {
  whatsappResponse = await sendWhatsAppTemplateMessage(
    "226076", 
    "https://bot-data.s3.ap-southeast-1.wasabisys.com/upload/2025/8/flowbuilder/flowbuilder-108017-1756203446.png",
    phoneNumber,
    name, 
    "169013" 
  );
    }
    
        const token = jwt.sign(
          { id: newUser._id, role: newUser.role },
          JWT_SECRET,
          {
            expiresIn: "7d",
          }
        );
    
        res.cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });
    
    res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        accountType: newUser.accountType,
        isOnboardingCompleted: newUser.isOnboardingCompleted,
        phoneNumber: newUser.phoneNumber,
      },
      whatsapp: whatsappResponse,
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during signup.",
    });
  }
};

export const getAuthenticatedUser = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }

    const user = await User.findById(req.user._id).select(
      "_id name email role profilePic isActive phoneNumber accountType isOnboardingCompleted"
    );

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json({ success: true, user });
  } catch (error) {
    console.error("Get authenticated user error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const updateUserSettings = async (req, res) => {
  try {
    const userId = req.user._id;
    const { fullName, phoneNumber, oldPassword, newPassword, accountType } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (fullName) user.name = fullName;
    if (phoneNumber) user.phoneNumber = phoneNumber;
    if (accountType) user.accountType = accountType;

    if (newPassword) {
      if (!user.password || user.password == "") {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
      } else {
        if (!oldPassword) {
          return res.status(400).json({
            success: false,
            message: "Old password is required to change the password",
          });
        }

        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
          return res.status(400).json({
            success: false,
            message: "Old password is incorrect",
          });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
      }
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        isActive: user.isActive,
        accountType: user.accountType,
      },
    });
  } catch (error) {
    console.error("[update-profile] Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
export const logoutUser = (req, res) => {
  try {
    res.cookie("token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 0,
    });

    res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during logout",
    });
  }
};
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// export const googleAuth = async (req, res) => {
//   console.log("GOOGLE_REDIRECT_URI:", process.env.GOOGLE_REDIRECT_URI);

//   try {
//     const { code } = req.body;

//     if (!code)
//       return res
//         .status(400)
//         .json({ success: false, message: "Authorization code is required" });

//     // 1️⃣ Exchange code for access token
//     const tokenRes = await axios.get(
//       "https://oauth2.googleapis.com/token",
//       new URLSearchParams({
//         code,
//         client_id: process.env.GOOGLE_CLIENT_ID,
//         client_secret: process.env.GOOGLE_CLIENT_SECRET,
//         redirect_uri: process.env.GOOGLE_REDIRECT_URI,
//         grant_type: "authorization_code",
//       }),
//       { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
//     );

//     const { access_token } = tokenRes.data;
//     if (!access_token)
//       return res
//         .status(400)
//         .json({ success: false, message: "Failed to get access token" });

//     // 2️⃣ Get user profile
//     const profileRes = await axios.get(
//       "https://www.googleapis.com/oauth2/v3/userinfo",
//       { headers: { Authorization: `Bearer ${access_token}` } }
//     );

//     const profile = profileRes.data;

//     // 3️⃣ Find or create user
//     let user = await User.findOne({ email: profile.email });
//     if (!user) {
//       user = await User.create({
//         googleId: profile.sub,
//         name: profile.name,
//         email: profile.email,
//         profilePic: profile.picture,
//         role: "user",
//         isActive: true,
//       });
//     }

//     // 4️⃣ Generate JWT
//     const token = jwt.sign(
//       { id: user._id, email: user.email },
//       process.env.JWT_SECRET,
//       { expiresIn: "7d" }
//     );

//     // 5️⃣ Set cookie
//     res.setHeader(
//       "Set-Cookie",
//       cookie.serialize("token", token, {
//         httpOnly: true,
//         secure: process.env.NODE_ENV === "production",
//         sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
//         maxAge: 7 * 24 * 60 * 60,
//         path: "/",
//       })
//     );

//     // 6️⃣ Respond to frontend
//     res.status(200).json({
//       success: true,
//       message: "Login successful",
//       user: {
//         id: user._id,
//         name: user.name,
//         email: user.email,
//         role: user.role,
//         profilePic: user.profilePic,
//         isActive: user.isActive,
//       },
//     });
//   } catch (err) {
//     console.error("Google Auth Error:", err);
//     res
//       .status(500)
//       .json({ success: false, message: "Login failed", error: err.message });
//   }
// };



export const googleAuth = async (req, res, next) => {
  try {
    const code = req.body?.code;
    if (!code) {
      return res.status(400).json({
        success: false,
        message: "Authorization code is required",
      });
    }

    // 🔹 Exchange authorization code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // 🔹 Fetch user profile from Google
    const userRes = await axios.get(
      `https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${tokens.access_token}`
    );

    const { email, name, picture } = userRes.data;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Failed to fetch Google user information",
      });
    }

    // 🔹 Check if user exists or create new one
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        name,
        email,
        role: "user",
        isActive: true,
        isOnboardingCompleted: false,
        accountType: "personal", // ✅ consistent naming
      });
    }

    console.log("Redirect URI being used:", oauth2Client.redirectUri);

    // 🔹 Generate JWT token
    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, {
      expiresIn: "7d",
    });

        const isProduction = process.env.NODE_ENV === "production";


    // 🔹 Set HTTP-only cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "None" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    });

    // 🔹 Return response
    return res.status(200).json({
      success: true,
      message: "Google login successful",
      token,
      user,
    });
  } catch (err) {
    console.error("Google Auth Error:", err?.response?.data || err.message);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error during Google login",
    });
  }
};





export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  console.log("Forgot password request for email:", email);

  if (!email) {
    return res
      .status(400)
      .json({ success: false, message: "Email is required" });
  }

  try {
    const user = await User.findOne({ email });
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins expiry

    user.verificationCode = otp;
    user.codeExpires = expiry;
    await user.save();

    await sendEmail(
      email,
      "Taptune Password Reset OTP",
      `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Password Reset</title>
</head>
<body style="margin:0; padding:0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f7f8fc;">
  <table align="center" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px; margin:auto; background:#ffffff; border-radius:12px; box-shadow:0 4px 6px rgba(0,0,0,0.1);">
    <!-- Header -->
    <tr>
      <td align="center" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; border-radius:12px 12px 0 0;">
        <img src="https://taptune.in/logo.png" alt="Taptune Logo" width="60" height="60" style="border-radius:8px; margin-bottom:10px;" />
        <h1 style="color:#fff; font-size:28px; margin:0;">Taptune</h1>
        <p style="color:#e2e8f0; font-size:16px; margin:5px 0 0;">Password Reset Request</p>
      </td>
    </tr>

    <!-- Content -->
    <tr>
      <td style="padding:40px 30px; text-align:center;">
        <h2 style="font-size:24px; font-weight:600; color:#1a202c; margin-bottom:20px;">Reset Your Password</h2>
        <p style="font-size:16px; color:#4a5568; line-height:1.8; margin-bottom:40px;">
          Use the code below to reset your password. This code is valid for 10 minutes only.
        </p>

        <!-- OTP Box -->
        <div style="display:flex; justify-content:center; gap:10px; margin-bottom:40px;">
          ${otp
            .split("")
            .map(
              (digit) =>
                `<div style="width:50px; height:50px; background:#edf2f7; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:24px; font-weight:bold; color:#2d3748;">${digit}</div>`
            )
            .join("")}
        </div>

        <p style="font-size:14px; color:#718096; font-style:italic;">
          Enter this code in the password reset form.
        </p>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background:#f7f8fc; padding:30px; text-align:center; border-top:1px solid #e2e8f0; border-radius:0 0 12px 12px;">
        <p style="color:#718096; font-size:14px; margin-bottom:5px;">
          If you didn't request this, safely ignore this email.
        </p>
        <p style="color:#a0aec0; font-size:12px; margin:0;">
          © 2025 Taptune. All rights reserved.<br/>
          123 Business Street, Kerala, India
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`
    );

    res.json({ success: true, message: "OTP sent to email" });
  } catch (err) {
    console.error("Send email error:", err);
    res
      .status(500)
      .json({
        success: false,
        message: "Failed to send OTP. Try again later.",
      });
  }
};







export const verifyOtp = async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res
      .status(400)
      .json({ success: false, message: "Email and OTP are required" });
  }

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    if (user.verificationCode !== otp) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    if (new Date(user.codeExpires) < new Date()) {
      return res
        .status(400)
        .json({ success: false, message: "OTP has expired" });
    }

    user.verificationCode = "";
    user.codeExpires = null;
    await user.save();

    res.json({ success: true, message: "OTP verified successfully" });
  } catch (err) {
    console.error("OTP verification error:", err);
    res
      .status(500)
      .json({
        success: false,
        message: "Server error. Please try again later.",
      });
  }
};

export const createNewPassword = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ success: false, message: "Email and new password are required" });
  }

  if (password.length < 8) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 8 characters",
    });
  }

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    user.verificationCode = "";
    user.codeExpires = null;

    await user.save();

    res.json({
      success: true,
      message: "Password reset successfully. You can now login!",
    });
  } catch (err) {
    console.error("Password reset error:", err);
    res
      .status(500)
      .json({
        success: false,
        message: "Server error. Please try again later.",
      });
  }
};