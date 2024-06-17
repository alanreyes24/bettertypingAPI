const express = require("express");
const router = express.Router();
const User = require("../models/User");
const authController = require("../controllers/authController");

router.get("/auth/signup", authController.signup_get);
router.post("/auth/signup", authController.signup_post);

router.get("/auth/login", authController.login_get);
router.post("/auth/login", authController.login_post);

const verifyToken = (req, res, next) => { // need to change this to it's own file later
  const token = req.cookies["auth-token"];
  if (!token) return res.status(401).send("Access Denied");

  try {
    const verified = jwt.verify(token, process.env.TOKEN_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    res.status(400).send("Invalid Token");
  }
};

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



module.exports = router;
