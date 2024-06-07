const express = require("express");
const router = express.Router();
const verifyToken = require("./verifyToken");
const User = require("../models/User");
const authController = require("../controllers/authController");

router.get("/auth/signup", authController.signup_get);
router.post("/auth/signup", authController.signup_post);

router.get("/auth/login", authController.login_get);
router.post("/auth/login", authController.login_post);

router.get("/auth/profile", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    console.log("User found:", user);
    if (!user) return res.status(404).send("User not found");
    res.send(user);
  } catch (err) {
    console.error("Error fetching profile:", err);
    res.status(500).send("Server Error");
  }
});

// router.post("/test", authController.test_post);

module.exports = router;
