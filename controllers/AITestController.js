const jwt = require("jsonwebtoken");
const User = require("../models/User");
const AITest = require("../models/AITest");

module.exports.ai_getAllByUser = async (req, res) => {
  const token = req.cookies["auth-token"];

  if (!token) {
    return res.status(401).send("Access denied. No token provided.");
  }

  try {
    const decoded = jwt.verify(token, process.env.TOKEN_SECRET);
    const _id = decoded._id;

    const user = await User.findOne({ _id: _id });

    if (!user) {
      return res.status(404).send("User not found.");
    }

    const allUserTests = await AITest.find({ userID: _id });

    if (!allUserTests) {
      return res.status(404).send("No tests for this user found");
    }

    if (allUserTests && allUserTests.length > 0) {
      res.status(200).json(allUserTests);
    } else {
      res.status(404).send("No tests found for this user.");
    }
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      res.status(400).send("Invalid token.");
    } else if (error.name === "TokenExpiredError") {
      res.status(401).send("Token expired.");
    } else {
      console.error(error);
      res.status(500).send("Internal Server Error");
    }
  }
};

module.exports.ai_test = async (req, res) => {
  const passedTest = req.body;

  try {
    const test = await AITest.create({
      userID: passedTest.userID,
      username: passedTest.username,
      words: {
        wordsList: passedTest.words.wordList,
        correctLetters: passedTest.words.correctLetters,
        incorrectLetters: passedTest.words.incorrectLetters,
        trueWPMArray: passedTest.words.trueWPMArray,
        rawWPMArray: passedTest.words.rawWPMArray,
      },
      settings: {
        type: passedTest.settings.type,
        length: passedTest.settings.length,
        count: passedTest.settings.count,
        difficulty: passedTest.settings.difficulty,
      },
      results: {
        correctOnlyWPM: passedTest.results.correctOnlyWPM,
        rawWPM: passedTest.results.rawWPM,
        trueWPM: passedTest.results.trueWPM,
        accuracy: passedTest.results.accuracy,
      },
      eventLog: passedTest.eventLog,
      timestamp: passedTest.timestamp,
    });

    res.status(200).send(test);
  } catch (error) {
    console.error(error);

    if (error.code === 11000) {
      res.status(409).send("Duplicate key error: " + error.message);
    } else if (error.name === "ValidationError") {
      res.status(400).send("Validation error: " + error.message);
    } else {
      res.status(500).send("An error occurred while processing your request.");
    }
  }
};
