import User from "../models/userSchema.js";
import bcrypt from "bcryptjs";
import {
  decryptRequest,
  encryptResponse,
} from "../utils/handler/flowCrypto.js";
import Profile from "../models/profileSchema.js";
import flowSessionSchema from "../models/flowSessionSchema.js";
import Card from "../models/cardSchema.js";
import CardOrder from "../models/cardOrders.js";
import ReviewCardOrder from "../models/ReviewCardOrders.js";
import { v4 as uuidv4 } from "uuid";
import { sendProfileUpdatedTemplate } from "../utils/sendWhatsTempMessages.js";


const PRIVATE_KEY = process.env.WHATSAPP_FLOW_PRIVATE_KEY;


export const signUpFlowHandler = async (req, res) => {
  try {
    // 1. Decrypt the incoming request from WhatsApp
    const { decryptedBody, aesKey, iv } = decryptRequest(req.body, PRIVATE_KEY);
    const { action, screen, data = {}, flow_token } = decryptedBody;

    /* ---------------- HEALTH CHECK ---------------- */
    if (action === "ping") {
      return res
        .status(200)
        .send(encryptResponse({ data: { status: "active" } }, aesKey, iv));
    }

    /* ---------------- INIT / BACK HANDLER ---------------- */
    // If the flow starts or the user presses 'Back', show the Entry Screen
    if (action === "INIT" || action === "BACK") {
      return res.status(200).send(
        encryptResponse(
          {
            screen: "ENTRY_SCREEN",
            data: {},
          },
          aesKey,
          iv
        )
      );
    }

    /* ---------------- GET USER PHONE FROM SESSION ---------------- */
    // We need the WhatsApp number to link the account
    const session = await flowSessionSchema.findOne({ flowToken: flow_token });

    if (!session?.whatsappNumber) {
      return res.status(200).send(
        encryptResponse(
          {
            screen: "ENTRY_SCREEN",
            data: { error_message: "Session expired. Please reopen." },
          },
          aesKey,
          iv
        )
      );
    }
    const whatsappNumber = session.whatsappNumber;

    /* ---------------- LOGIC: ENTRY_SCREEN -> SIGNUP_SCREEN ---------------- */
    if (screen === "ENTRY_SCREEN" && action === "data_exchange") {
      return res.status(200).send(
        encryptResponse(
          {
            screen: "SIGNUP_SCREEN",
            data: {
              // Pre-fill phone if you want, or just leave blank
            },
          },
          aesKey,
          iv
        )
      );
    }

    /* ---------------- LOGIC: SIGNUP_SCREEN -> PROCESS DATA ---------------- */
    if (screen === "SIGNUP_SCREEN" && action === "data_exchange") {
      const { full_name, email, password } = data;

      // 1. Input Validation
      if (!full_name || !email || !password) {
        return res.status(200).send(
          encryptResponse(
            {
              screen: "SIGNUP_SCREEN",
              data: { error_message: "All fields are required." },
            },
            aesKey,
            iv
          )
        );
      }

      // 2. Check if User Already Exists (Email or Phone)
      const existingUser = await User.findOne({
        $or: [{ email: email.toLowerCase() }],
      });

      if (existingUser) {
        return res.status(200).send(
          encryptResponse(
            {
              screen: "SIGNUP_SCREEN",
              data: {
                error_message:
                  "Account already exists with this Email or Phone.",
              },
            },
            aesKey,
            iv
          )
        );
      }

      // 3. Create New User
      // Note: In production, ensure you hash the password before saving!
      const newUser = new User({
        name: full_name,
        email: email,
        password: password, // Recommend: await bcrypt.hash(password, 10)
        phoneNumber: whatsappNumber, // Taken securely from flow session
        role: "user",
        accountType: "personal",
        isActive: true,
      });

      await newUser.save();

      // 4. Success Response
      return res.status(200).send(
        encryptResponse(
          {
            screen: "SUCCESS_SCREEN",
            data: {
              extension_message_response: {
                params: {
                  flow_token: flow_token,
                  status: "ACCOUNT_CREATED",
                },
              },
            },
          },
          aesKey,
          iv
        )
      );
    }

    /* ---------------- FALLBACK ---------------- */
    console.error("Unhandled screen/action:", screen, action);
    return res.status(200).send(
      encryptResponse(
        {
          screen: "ENTRY_SCREEN",
          data: { error_message: "Something went wrong. Please try again." },
        },
        aesKey,
        iv
      )
    );
  } catch (error) {
    console.error("Signup Flow Error:", error);
    // Return a generic error to the phone to prevent hanging
    return res.status(500).send();
  }
};

export const profileEditWithImage = async (req, res) => {
  try {
    const { decryptedBody, aesKey, iv } = decryptRequest(req.body, PRIVATE_KEY);
    const { action, screen, data = {}, flow_token } = decryptedBody;

    /* ---------------- HEALTH CHECK ---------------- */
    if (action === "ping") {
      return res
        .status(200)
        .send(encryptResponse({ data: { status: "active" } }, aesKey, iv));
    }

    /* ---------------- INIT / BACK ---------------- */
    if (action === "INIT" || action === "BACK") {
      return res
        .status(200)
        .send(
          encryptResponse({ screen: "ENTRY_SCREEN", data: {} }, aesKey, iv)
        );
    }

    /* ---------------- LOAD SESSION ---------------- */
    const session = await flowSessionSchema.findOne({ flowToken: flow_token });
    if (!session?.whatsappNumber) {
      return res.status(200).send(
        encryptResponse(
          {
            screen: "ENTRY_SCREEN",
            data: { error_message: "Session expired. Please reopen the flow." },
          },
          aesKey,
          iv
        )
      );
    }

    const whatsappNumber = session.whatsappNumber;

    /* ---------------- ENTRY → MENU ---------------- */
    if (screen === "ENTRY_SCREEN" && action === "data_exchange") {
      return res
        .status(200)
        .send(encryptResponse({ screen: "MENU_SCREEN", data: {} }, aesKey, iv));
    }

    /* ---------------- MENU SELECTION ---------------- */
    if (screen === "MENU_SCREEN" && action === "data_exchange") {
      if (!data.menu_selection) {
        return res.status(200).send(
          encryptResponse(
            {
              screen: "MENU_SCREEN",
              data: { error_message: "Please select an option" },
            },
            aesKey,
            iv
          )
        );
      }

      return res
        .status(200)
        .send(
          encryptResponse({ screen: data.menu_selection, data: {} }, aesKey, iv)
        );
    }

    /* ---------------- LOAD PROFILE ---------------- */
    const profile = await Profile.findOne({
      $or: [{ watsappNumber: whatsappNumber }, { phoneNumber: whatsappNumber }],
    });

    if (!profile) {
      return res.status(200).send(
        encryptResponse(
          {
            screen: "MENU_SCREEN",
            data: { error_message: "Profile not found" },
          },
          aesKey,
          iv
        )
      );
    }

    /* ---------------- FIELD UPDATES ---------------- */
    let didUpdate = false;

    if (screen === "EDIT_NAME" && data.full_name?.trim()) {
      profile.fullName = data.full_name.trim();
      didUpdate = true;
    }

    if (screen === "EDIT_USERNAME" && data.username?.trim()) {
      profile.userName = data.username.trim();
      didUpdate = true;
    }

    if (screen === "EDIT_BIO") {
      profile.bio = data.bio || "";
      didUpdate = true;
    }

    if (screen === "EDIT_EMAIL" && data.email?.trim()) {
      profile.email = data.email.trim();
      didUpdate = true;
    }

    if (screen === "EDIT_LOCATION") {
      profile.locationLink = data.location_link || "";
      didUpdate = true;
    }

    if (screen === "EDIT_BANNER_DESIGN") {
      profile.designType = data.design_type || "black";
      didUpdate = true;
    }

    /* ---------------- SAVE + SUCCESS ---------------- */
    if (didUpdate) {
      await profile.save();

      return res
        .status(200)
        .send(
          encryptResponse({ screen: "SUCCESS_SCREEN", data: {} }, aesKey, iv)
        );
    }

    /* ---------------- FLOW EXIT (SEND TEMPLATE HERE) ---------------- */
    if (screen === "SUCCESS_SCREEN" && action === "data_exchange") {
      if (data.next_action === "FLOW_EXIT") {
        // 🔔 SEND PROFILE UPDATED TEMPLATE
        await sendProfileUpdatedTemplate({
          phoneNumber: whatsappNumber,
          fullName: profile.fullName,
          profileViewId: profile.viewId,
        });

        // Optional: clean session
        await flowSessionSchema.deleteOne({ flowToken: flow_token });

        return res
          .status(200)
          .send(encryptResponse({ screen: "FLOW_EXIT", data: {} }, aesKey, iv));
      }

      if (data.next_action === "MENU_SCREEN") {
        return res
          .status(200)
          .send(
            encryptResponse({ screen: "MENU_SCREEN", data: {} }, aesKey, iv)
          );
      }

      return res.status(200).send(
        encryptResponse(
          {
            screen: "SUCCESS_SCREEN",
            data: { error_message: "Please select an option" },
          },
          aesKey,
          iv
        )
      );
    }

    /* ---------------- SAFETY FALLBACK ---------------- */
    return res
      .status(200)
      .send(
        encryptResponse(
          { screen: "MENU_SCREEN", data: { error_message: "Invalid action" } },
          aesKey,
          iv
        )
      );
  } catch (error) {
    console.error("Flow error:", error);
    return res.sendStatus(200);
  }
};

export const orderFlowHandler = async (req, res) => {
  try {
    const { decryptedBody, aesKey, iv } = decryptRequest(req.body, PRIVATE_KEY);
    const { action, screen, data = {}, flow_token } = decryptedBody;

    /* ---------------- HEALTH & INIT ---------------- */
    if (action === "ping") {
      return res
        .status(200)
        .send(encryptResponse({ data: { status: "active" } }, aesKey, iv));
    }

    if (action === "INIT" || action === "BACK") {
      return res
        .status(200)
        .send(
          encryptResponse({ screen: "INTRO_SCREEN", data: {} }, aesKey, iv)
        );
    }

    /* ---------------- NAVIGATION LOGIC ---------------- */
    if (screen === "INTRO_SCREEN" && action === "data_exchange") {
      const selection = data.selection;

      if (selection === "goto_digital_product") {
        return res
          .status(200)
          .send(
            encryptResponse(
              { screen: "DIGITAL_PRODUCT_SCREEN", data: {} },
              aesKey,
              iv
            )
          );
      }

      if (selection === "goto_review_product") {
        return res
          .status(200)
          .send(
            encryptResponse(
              { screen: "REVIEW_PRODUCT_SCREEN", data: {} },
              aesKey,
              iv
            )
          );
      }
    }

    if (screen === "DIGITAL_PRODUCT_SCREEN" && action === "data_exchange") {
      return res
        .status(200)
        .send(
          encryptResponse(
            { screen: "DIGITAL_INPUT_SCREEN", data: {} },
            aesKey,
            iv
          )
        );
    }

    if (screen === "REVIEW_PRODUCT_SCREEN" && action === "data_exchange") {
      return res
        .status(200)
        .send(
          encryptResponse(
            { screen: "REVIEW_INPUT_SCREEN", data: {} },
            aesKey,
            iv
          )
        );
    }

    /* ======================================================================
       CASE 1: DIGITAL CARD (UNCHANGED CORE LOGIC)
       ====================================================================== */
    if (screen === "DIGITAL_INPUT_SCREEN" && action === "data_exchange") {
      const { full_name, email, designation } = data;
      const normalizedEmail = email?.toLowerCase().trim();

      const user = await User.findOne({ email: normalizedEmail });
      if (!user) {
        return res.status(200).send(
          encryptResponse(
            {
              screen: "DIGITAL_INPUT_SCREEN",
              data: {
                error_message: "User not found. Please use registered email.",
              },
            },
            aesKey,
            iv
          )
        );
      }

      const card = await Card.findOne({
        category: { $ne: "Review Card" },
        isActive: true,
      });

      if (!card) {
        return res.status(200).send(
          encryptResponse(
            {
              screen: "DIGITAL_INPUT_SCREEN",
              data: {
                error_message: "Digital Card stock unavailable.",
              },
            },
            aesKey,
            iv
          )
        );
      }

      const newOrder = new CardOrder({
        userId: user._id,
        cardId: card._id,
        fullName: full_name,
        designation,
        phoneNumber: user.phoneNumber,
        email: normalizedEmail,
        quantity: 1,
        status: "Pending",
      });

      const savedOrder = await newOrder.save();

      const uniqueViewId = `${full_name
        .replace(/\s+/g, "")
        .toLowerCase()}-${uuidv4().slice(0, 6)}`;

      const newProfile = new Profile({
        userId: user._id,
        cardOrderId: savedOrder._id,
        viewId: uniqueViewId,
        fullName: full_name,
        email: normalizedEmail,
        phoneNumber: user.phoneNumber,
        designation,
        designType: "black",
        isActive: true,
      });

      const savedProfile = await newProfile.save();
      savedOrder.profileId = savedProfile._id;
      await savedOrder.save();

      user.isOrdered = true;
      await user.save();

      return res.status(200).send(
        encryptResponse(
          {
            screen: "SUCCESS_SCREEN",
            data: {
              ordered_product: card.cardName,
              card_name: card.cardName,
            },
          },
          aesKey,
          iv
        )
      );
    }

    /* ======================================================================
   CASE 2: REVIEW CARD (EMAIL → PHONE(from flow_token) → ADMIN)
   ====================================================================== */
    if (screen === "REVIEW_INPUT_SCREEN" && action === "data_exchange") {
      const { brand_name, email, review_url } = data;
      const normalizedEmail = email?.toLowerCase().trim();

      /* ---------------- FETCH PHONE USING FLOW TOKEN ---------------- */

      const session = await flowSessionSchema.findOne({ flowToken: flow_token });

      if (!session || !session.whatsappNumber) {
        return res.status(200).send(
          encryptResponse(
            {
              screen: "REVIEW_INPUT_SCREEN",
              data: {
                error_message:
                  "Unable to identify your phone number. Please restart the flow.",
              },
            },
            aesKey,
            iv
          )
        );
      }

      const phoneNumber = session.whatsappNumber;

      let user = null;
      let finalBrandName = brand_name;

      /* ---------------- USER RESOLUTION ---------------- */

      // CASE 1️⃣: Email provided → MUST exist
      if (normalizedEmail) {
        user = await User.findOne({ email: normalizedEmail });

        if (!user) {
          return res.status(200).send(
            encryptResponse(
              {
                screen: "REVIEW_INPUT_SCREEN",
                data: {
                  error_message:
                    "No account found with this email. Please use a registered email.",
                },
              },
              aesKey,
              iv
            )
          );
        }
      }

      // CASE 2️⃣: Email NOT provided → use phone
      if (!normalizedEmail) {
        user = await User.findOne({
          $or: [{ phoneNumber }],
        });

        // CASE 3️⃣: Phone not found → ADMIN fallback
        if (!user) {
          user = await User.findOne({ role: "Admin" });

          if (!user) {
            return res.status(200).send(
              encryptResponse(
                {
                  screen: "REVIEW_INPUT_SCREEN",
                  data: {
                    error_message:
                      "Admin account not configured. Cannot proceed.",
                  },
                },
                aesKey,
                iv
              )
            );
          }

          // 🔴 Append phone number to brand name
          finalBrandName = `${brand_name} - (${phoneNumber})`;
        }
      }

      /* ---------------- FETCH REVIEW CARD ---------------- */

      const card = await Card.findOne({
        category: "Review Card",
        isActive: true,
      });

      if (!card) {
        return res.status(200).send(
          encryptResponse(
            {
              screen: "REVIEW_INPUT_SCREEN",
              data: {
                error_message: "Review Card stock unavailable.",
              },
            },
            aesKey,
            iv
          )
        );
      }

      /* ---------------- CREATE REVIEW CARD ORDER ---------------- */

      const newReviewOrder = new ReviewCardOrder({
        userId: user._id,
        cardId: card._id,
        brandName: finalBrandName,
        googleReviewUrl: review_url,
        email: normalizedEmail || null,
        phoneNumber,
        status: "pending",
        createdBy: user.role === "admin" ? "admin" : "user",
      });

      await newReviewOrder.save();

      if (user.role !== "admin") {
        user.isOrdered = true;
        await user.save();
      }

      return res.status(200).send(
        encryptResponse(
          {
            screen: "SUCCESS_SCREEN",
            data: {
              ordered_product: card.cardName,
              card_name: card.cardName,
            },
          },
          aesKey,
          iv
        )
      );
    }

    return res.status(200).send(encryptResponse({}, aesKey, iv));
  } catch (error) {
    console.error("Order Flow Error:", error);
    return res.status(500).send();
  }
};





















