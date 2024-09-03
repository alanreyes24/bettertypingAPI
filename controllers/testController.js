const jwt = require("jsonwebtoken");
const Test = require("../models/Test");
const User = require("../models/User");

module.exports.test_getTimeTestRankings = async (req, res) => {
  try {
    let duration = parseInt(req.query.duration || 0);
    duration = duration * 10;
    let timeFrame = req.query.timeFrame;

    // Set startOfDay to the start of the current day in UTC and convert to Unix timestamp in milliseconds
    const now = new Date();
    const startOfDay = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    );
    const startOfDayTimestamp = startOfDay.getTime();

    let filteredTests;

    if (timeFrame === "all-time") {
      filteredTests = await Test.aggregate([
        { $unwind: "$results" },
        { $unwind: "$settings" },
        {
          $match: {
            "settings.length": duration,
            "settings.type": "time",
          },
        },
        { $sort: { "results.trueWPM": -1 } },
      ]);
    } else if (timeFrame === "daily") {
      // Log all documents to see the timestamps
      const allTests = await Test.find({}).limit(10); // Limiting to 10 for brevity

      filteredTests = await Test.aggregate([
        { $unwind: "$results" },
        { $unwind: "$settings" },
        {
          $match: {
            "settings.length": duration,
            "settings.type": "time",
            timestamp: { $gte: startOfDayTimestamp },
          },
        },
        { $sort: { "results.trueWPM": -1 } },
      ]);

      // Log the retrieved tests to see the timestamp format
    }

    if (!filteredTests || filteredTests.length === 0) {
      return res
        .status(404)
        .send("No tests found matching the specified duration or time-frame");
    }

    res.status(200).send(filteredTests);
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .send("An error occurred while fetching time test rankings.");
  }
};

module.exports.test_getWordTestRankings = async (req, res) => {
  try {
    let count = parseInt(req.query.count || 0);
    let timeFrame = req.query.timeFrame;

    // Set startOfDay to the start of the current day in UTC and convert to Unix timestamp in milliseconds
    const now = new Date();
    const startOfDay = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    );
    const startOfDayTimestamp = startOfDay.getTime();

    let filteredTests;

    if (timeFrame === "all-time") {
      filteredTests = await Test.aggregate([
        { $unwind: "$results" },
        { $unwind: "$settings" },
        {
          $match: {
            "settings.count": count,
            "settings.type": "words",
          },
        },
        { $sort: { "results.trueWPM": -1 } },
      ]);
    } else if (timeFrame === "daily") {
      filteredTests = await Test.aggregate([
        { $unwind: "$results" },
        { $unwind: "$settings" },
        {
          $match: {
            "settings.count": count,
            "settings.type": "words",
            timestamp: { $gte: startOfDayTimestamp },
          },
        },
        { $sort: { "results.trueWPM": -1 } },
      ]);
    }

    if (!filteredTests || filteredTests.length === 0) {
      return res
        .status(404)
        .send("No tests found matching the specified count or time-frame");
    }

    res.status(200).send(filteredTests);
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .send("An error occurred while fetching word test rankings.");
  }
};

module.exports.test_getAllByUser = async (req, res) => {
  console.log("Cookies Received: ", req.cookies);

  const token = req.cookies["auth-token"];

  if (!token) {
    return res
      .status(401)
      .send(`Access denied. No token provided. Token Value: ${token}`);
  }

  try {
    const decoded = jwt.verify(token, process.env.TOKEN_SECRET);
    const _id = decoded._id;

    const user = await User.findOne({ _id: _id });

    if (!user) {
      return res.status(404).send("User not found.");
    }

    const allUserTests = await Test.find({ userID: _id });

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

module.exports.test_getUserMostRecentTest = async (req, res) => {
  const token = req.cookies["auth-token"];

  if (!token) {
    return res.status(401).send("No token provided...");
  }

  try {
    const decoded = jwt.verify(token, process.env.TOKEN_SECRET);

    const _id = decoded._id;

    const test = await Test.findOne({ userID: _id }).sort({ timestamp: -1 });

    if (!test) {
      return res.status(404).send("No recent test found for this user.");
    }

    res.status(200).send(test);
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      res.status(400).send("Invalid token.");
    } else if (error.name === "TokenExpiredError") {
      res.status(401).send("Token expired.");
    } else {
      console.error(error);
      res
        .status(500)
        .send("An error occurred while fetching the most recent test.");
    }
  }
};

module.exports.test_post = async (req, res) => {
  const passedTest = req.body;

  try {
    const test = await Test.create({
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
