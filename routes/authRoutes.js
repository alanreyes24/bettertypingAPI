const { Router } = require("express");

const authController = require("../controllers/authController");

const router = Router();

router.get("/auth/signup", authController.signup_get);
router.post("/auth/signup", authController.signup_post);

router.get("/auth/login", authController.login_get);
router.post("/auth/login", authController.login_post);

module.exports = router;
