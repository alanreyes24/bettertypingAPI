const express = require("express");
const router = express.Router();
const testController = require("../controllers/testController");

router.post("/test", testController.test_post);

router.get("/test/:id", testController.test_getByID);

module.exports = router;
