// testRoutes.js

const express = require("express");
const router = express.Router();
const testController = require("../controllers/testController");

router.post("/test", testController.test_post);

router.get("/test/rankings", testController.test_getTypeOfTests);

router.get("/test/:id", testController.test_getByID);

router.get("/test/all/:userID", testController.test_getAllByUser);



module.exports = router;
