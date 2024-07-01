const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const aiController = require("../controllers/aiController");
const User = require("../models/User");
const Test = require("../models/Test");

router.get("/ai/getAnalysis", aiController.ai_getAnalysis);
router.get("/ai/getAIWordList", aiController.getAIWordList);

module.exports = router;
