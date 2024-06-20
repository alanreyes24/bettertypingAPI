// testRoutes.js

const express = require("express");
const router = express.Router();
const testController = require("../controllers/testController");

router.post("/test", testController.test_post);

router.get("/test/timeRankings", testController.test_getTimeTestRankings);

router.get("/test/wordRankings", testController.test_getWordTestRankings);

router.get("/test/chartData", testController.test_getChartData)

router.get("/test/allByUser", testController.test_getAllByUser);

router.get("/test/all/:userID", testController.test_getAllByUser); // not sure we should use this



module.exports = router;
