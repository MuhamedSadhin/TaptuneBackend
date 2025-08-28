
import express from "express";
import { createRequire } from "module";
const require = createRequire(import.meta.url);

const cards = require("../firebaseDB/cards.json");
const profiles = require("../firebaseDB/profile.json");
const connects = require("../firebaseDB/connects.json");
const contacts = require("../firebaseDB/contacts.json");
const users = require("../firebaseDB/users.json");


import mongoose from "mongoose";
import User from "../models/userSchema.js";
import Profile from "../models/ProfileSchema.js";
import Connect from "../models/connectSchema.js";
import Enquiry from "../models/ContactSchema.js";
import Card from "../models/cardSchema.js";
import CardOrder from "../models/cardOrders.js";
import bcrypt from "bcryptjs";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    // 1️⃣ Users migration
    const userMap = {};
    for (const user of users) {
      if (!user.email) continue;
      const plainPassword = user.pass || "defaultpassword";
      const hashedPassword = await bcrypt.hash(plainPassword, 10);
      const newUser = new User({
        name: user.name,
        email: user.email,
        password: hashedPassword || "defaultpassword",
        phoneNumber: user.contact,
        role: user.role || "user",
        isOrdered: !!user.isOrder,
        isActive: user.isActive,
      });
      const savedUser = await newUser.save();
      userMap[user.id] = savedUser._id;
    }
    console.log(`✅ Migrated ${Object.keys(userMap).length} users.`);

    // 2️⃣ Cards migration
    const cardMap = {};
    for (const card of cards) {
      const newCard = new Card({
        cardName: card.name,
        price: card.price,
        category: card.category,
        frontImage: card.frontDesign,
        backImage: card.backDesign,
        isQr: !!card.isQrcode,
        isLogo: !!card.isLogo,
        isActive: card.isActivate,
      });
      const savedCard = await newCard.save();
      cardMap[card.id] = savedCard._id;
    }
    console.log(`✅ Migrated ${Object.keys(cardMap).length} cards.`);

    // 3️⃣ Profiles & CardOrders migration
    let profileCount = 0,
      orderCount = 0;
    for (const profile of profiles) {
      const userId = userMap[profile.userId];
      if (!userId) continue;

      let cardOrderId = null;
      if (profile) {
        const {
          selectCardId,
          fullName,
          designation,
          phoneNo,
          email,
          quantity,
          status,
        } = profile;

          const formatStatus = (value) => {
            if (!value) return "Pending";
            return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
          };

          const newOrder = new CardOrder({
            userId,
            profileId: null,
            cardId: cardMap[selectCardId],
            fullName,
            designation,
            phoneNumber: phoneNo,
            email,
            quantity: quantity || 1,
            status: formatStatus(status || "pending"), 
          });


        const savedOrder = await newOrder.save();
        cardOrderId = savedOrder._id;
        orderCount++;
      }

      const newProfile = new Profile({
        userId,
        viewId: profile.id,
        cardOrderId,
        fullName: profile.fullName,
        email: profile.email,
        phoneNumber: profile.phoneNo,
        watsappNumber: profile.whatsAppNo || "",
        profilePic: profile.profilePic || "",
        banner: profile.banner || "",
        bio: profile.bio || "",
        brandName: profile.brandName || "",
        designation: profile.designation || "",
        locationLink: profile.location || "",
        isActive: profile.isActivate !== false,
        socialMedia: Array.isArray(profile.socialMedia)
          ? profile.socialMedia.map((sm) => ({
              platform: sm.name,
              link: sm.link || "",
            }))
          : [],
      });
      const savedProfile = await newProfile.save();

      if (cardOrderId) {
        await CardOrder.findByIdAndUpdate(cardOrderId, {
          profileId: savedProfile._id,
        });
      }

      profileCount++;
    }
    console.log(
      `✅ Migrated ${profileCount} profiles with ${orderCount} card orders.`
    );

    // 4️⃣ Connects migration
    let connectCount = 0;
    for (const connect of connects) {
      const userId = userMap[connect.userId];
      if (!userId) continue;

      const newConnect = new Connect({
        userId,
        name: connect.name,
        email: connect.email,
        phoneNumber: connect.contact,
        designation: connect.designation || "",
        date: connect.date ? new Date(connect.date) : new Date(),
      });
      await newConnect.save();
      connectCount++;
    }
    console.log(`✅ Migrated ${connectCount} connects.`);

    // 5️⃣ Enquiries migration
    let enquiryCount = 0;
    for (const contact of contacts) {
      const newEnquiry = new Enquiry({
        name: contact.name,
        phoneNumber: contact.contact,
        email: contact.email || "",
        message: contact.massage || "",
      });
      await newEnquiry.save();
      enquiryCount++;
    }
    console.log(`✅ Migrated ${enquiryCount} enquiries.`);

    res.send("✅ Data migration completed successfully.");
  } catch (error) {
    console.error("🚨 Migration error:", error);
    res.status(500).send("Migration failed. Check server logs for details.");
  }
});

export default router;
