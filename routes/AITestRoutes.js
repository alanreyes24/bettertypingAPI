const express = require("express");
const router = express.Router();
const AITestController = require("../controllers/AITestController");

router.get("/ai/allByUser", AITestController.ai_getAllByUser);

router.post("/ai/test", AITestController.ai_test);

router.get("/ai/mostRecentTest", AITestController.ai_getMostRecentTest);

module.exports = router;
