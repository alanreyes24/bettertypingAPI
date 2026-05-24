// testRoutes.js

const express = require("express");
const router = express.Router();
const testController = require("../controllers/testController");

router.post("/test", testController.test_post);
router.post("/test/guest", testController.test_postGuest);

router.get("/test/timeRankings", testController.test_getTimeTestRankings);

router.get("/test/wordRankings", testController.test_getWordTestRankings);

router.get(
  "/test/userMostRecentTest",
  testController.test_getUserMostRecentTest
);

router.get("/test/allByUser", testController.test_getAllByUser);

module.exports = router;
