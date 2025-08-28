import User from "../models/userSchema.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { sendWhatsAppTemplateMessage } from "../utils/sendWabtuneMessage.js";
import axios from "axios";
import dotenv from "dotenv";
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

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      success: true,
      message: "Login successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
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
    const { name, email, password, phoneNumber } = req.body;


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
    });

    await newUser.save();

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
      "_id name email role profilePic isActive phoneNumber"
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
    const { fullName, phoneNumber, oldPassword, newPassword } = req.body;
    console.log("Update Profile Request Body:", req.body);

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (fullName) user.name = fullName;
    if (phoneNumber) user.phoneNumber = phoneNumber;

    if (newPassword) {
      if (!user.password || user.password == "") {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        console.log("New password set for Google user", newPassword);
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
//   try {
//     const { credential } = req.body;
//     console.log("Google Auth Request:", req.body);

//     if (!credential) {
//       return res
//         .status(400)
//         .json({ success: false, message: "Google credential is required" });
//     }

//     const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
//       method: "POST",
//       headers: { "Content-Type": "application/x-www-form-urlencoded" },
//       body: new URLSearchParams({
//         code: credential,
//         client_id: process.env.GOOGLE_CLIENT_ID,
//         client_secret: process.env.GOOGLE_CLIENT_SECRET,
//         redirect_uri: "http://localhost:5173",
//         grant_type: "authorization_code",
//       }),
//     });

//     const tokenData = await tokenRes.json();
//     console.log("Google Token Response:", tokenData);

//     if (tokenData.error) {
//       return res
//         .status(400)
//         .json({
//           success: false,
//           message: "Token exchange failed",
//           error: tokenData,
//         });
//     }

//     // Fetch user info with access token
//     const userInfoRes = await fetch(
//       "https://www.googleapis.com/oauth2/v3/userinfo",
//       {
//         headers: { Authorization: `Bearer ${tokenData.access_token}` },
//       }
//     );

//     const profile = await userInfoRes.json();
//     console.log("Google Profile:", profile);

//     // Find or create user
//     let user = await User.findOne({ email: profile.email });
//     if (!user) {
//       user = await User.create({
//         googleId: profile.sub,
//         name: profile.name,
//         email: profile.email,
//         profilePic: profile.picture,
//         phoneNumber: profile.phone_number || "",
//         isOrdered: false,
//         role: "user",
//         isActive: true,
//       });
//     }

//     // Generate our JWT
//     const ourToken = jwt.sign(
//       { id: user._id, email: user.email },
//       process.env.JWT_SECRET,
//       { expiresIn: "7d" }
//     );

//     // Set cookie
//     res.cookie("token", ourToken, {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === "production",
//       sameSite: "strict",
//       maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
//     });

//     return res.status(200).json({
//       success: true,
//       message: "Google login successful",
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
//     res.status(500).json({
//       success: false,
//       message: "Google Auth failed",
//       error: err.message,
//     });
//   }
// };





export const googleAuth = async (req, res) => {
  try {
    const { credential } = req.body;
    console.log("Google Auth Request:", req.body);

    if (!credential) {
      return res
        .status(400)
        .json({ success: false, message: "Google credential is required" });
    }

    // Step 1: Exchange authorization code for access token
    const tokenRes = await axios.post(
      "https://oauth2.googleapis.com/token",
      new URLSearchParams({
        code: credential,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.FRONTND_URL,
        grant_type: "authorization_code",
      }).toString(),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );

    const tokenData = tokenRes.data;
    console.log("Google Token Response:", tokenData);

    if (tokenData.error) {
      return res.status(400).json({
        success: false,
        message: "Token exchange failed",
        error: tokenData,
      });
    }

    // Step 2: Fetch user profile
    const userInfoRes = await axios.get(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      }
    );

    const profile = userInfoRes.data;
    console.log("Google Profile:", profile);

    // Step 3: Fetch phone number using People API
    let phoneNumber = "";
    try {
      const peopleRes = await fetch(
        "https://people.googleapis.com/v1/people/me?personFields=phoneNumbers",
        {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        }
      );
      const peopleData = peopleRes.data;
      console.log("Google People API:", peopleData);

      if (peopleData.phoneNumbers && peopleData.phoneNumbers.length > 0) {
        phoneNumber = peopleData.phoneNumbers[0].value;
      }
    } catch (err) {
      console.error("Failed to fetch phone number:", err);
    }

    // Step 4: Find or create user in DB
    let user = await User.findOne({ email: profile.email });
    if (!user) {
      user = await User.create({
        googleId: profile.sub,
        name: profile.name,
        email: profile.email,
        profilePic: profile.picture,
        phoneNumber: phoneNumber || "",
        isOrdered: false,
        role: "user",
        isActive: true,
      });
    } else {
      // Update phone if missing
      if (!user.phoneNumber && phoneNumber) {
        user.phoneNumber = phoneNumber;
        await user.save();
      }
    }

    // Step 5: Generate JWT
    const ourToken = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Step 6: Set cookie
    res.cookie("token", ourToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res.status(200).json({
      success: true,
      message: "Google login successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        profilePic: user.profilePic,
        isActive: user.isActive,
      },
    });
  } catch (err) {
    console.error("Google Auth Error:", err.response?.data || err.message);
    res.status(500).json({
      success: false,
      message: "Google Auth failed",
      error: err.message,
    });
  }
};