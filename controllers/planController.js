import Plan from "../models/Plans.js";


export const createPlan = async (req, res) => {
    try {
      const {
        name,
        description,
        profileCount,
        price,
        Duration, 
        features,
        isActive,
      } = req.body;

      if (!name || !profileCount || price === undefined || !Duration) {
        return res.status(400).json({
          success: false,
          message:
            "Missing required fields: name, profileCount, price, and Duration.", // Updated message
        });
      }

      const newPlan = new Plan({
        name,
        description,
        profileCount,
        price,
        Duration, 
        features,
        isActive,
      });

      const savedPlan = await newPlan.save();

      res.status(201).json({
        success: true,
        message: "Plan created successfully",
        data: savedPlan,
      });
    } catch (error) {
      if (error.name === "ValidationError") {
        const messages = Object.values(error.errors).map((val) => val.message);
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: messages,
        });
      } else if (error.message.includes("already exists")) {
        return res.status(409).json({
          success: false,
          message: error.message,
        });
      }

      console.error("Error creating plan:", error);
      res.status(500).json({
        success: false,
        message: "Server error. Please try again later.",
      });
    }
};


export const getPlans = async (req, res) => { 

   try {
     const plans = await Plan.find({ isActive: true }).sort({ price: 1 });

     res.status(200).json({
       success: true,
       count: plans.length,
       data: plans,
     });
   } catch (error) {
     console.error("Error fetching plans:", error);
     res.status(500).json({
       success: false,
       message: "Server error. Could not fetch plans.",
     });
   }
}

export const getPlanById = async (req, res) => {
  const id = req.body?.planId;
  console.log("Fetching plan with ID:", id);
  try {
    const plan = await Plan.findById(id);

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Plan not found",
      });
    }

    res.status(200).json({
      success: true,
      data: plan,
    });
  } catch (error) {
    console.error("Error fetching plan by ID:", error);
    res.status(500).json({
      success: false,
      message: "Server error. Could not fetch plan.",
    });
  }
}