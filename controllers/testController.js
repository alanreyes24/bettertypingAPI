// testRoutes.js

const Test = require("../models/Test");
const User = require("../models/User");
const jwt = require("jsonwebtoken");

module.exports.test_getTimeTestRankings = async (req, res) => {
  try {
    let duration = parseInt(req.query.duration || 0);
    duration = duration * 10;
    let timeFrame = req.query.timeFrame;

    console.log(duration);
    console.log(timeFrame);

    // Set startOfDay to the start of the current day in UTC and convert to Unix timestamp in milliseconds
    const now = new Date();
    const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const startOfDayTimestamp = startOfDay.getTime();

    console.log("Start of Day (UTC):", startOfDay.toISOString());
    console.log("Start of Day Timestamp:", startOfDayTimestamp);

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
      console.log("All Tests:", allTests);

      filteredTests = await Test.aggregate([
        { $unwind: "$results" },
        { $unwind: "$settings" },
        {
          $match: {
            "settings.length": duration,
            "settings.type": "time",
            "timestamp": { $gte: startOfDayTimestamp },
          },
        },
        { $sort: { "results.trueWPM": -1 } },
      ]);

      // Log the retrieved tests to see the timestamp format
      console.log("Filtered Tests:", filteredTests);
    }

    if (!filteredTests || filteredTests.length === 0) {
      return res.status(404).send("No tests found matching the specified duration or time-frame");
    }

    res.status(200).send(filteredTests);
  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
};


module.exports.test_getWordTestRankings = async (req, res) => {
  try {
    let { type } = req.query;

    const filteredTests = await Test.aggregate([
      { $unwind: "$results" }, // unwinds the settings array / object not sure what it is considered
      { $unwind: "$settings" }, // unwinds the settings array / object not sure what it is considered
      {
        $match: {
          "settings.type": "words", // Filter tests where 'settings.type' is 'words'
        },
      },
      { $sort: { "results.trueWPM": -1 } }, // Sorts by 'results.trueWPM' in descending order
    ]);

    res.status(200).send(filteredTests);
  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
};

module.exports.test_getChartData = async (req, res) => {

  const token = req.cookies["auth-token"];

  if (!token) {
    return res.status(401).send("No token provided.");
  }

  try {

    const decoded = jwt.verify(token, process.env.TOKEN_SECRET);

    const _id = decoded._id;


    const test = await Test.findOne({ userID: _id }).sort({ timestamp: -1 });

    res.status(200).send(test);
  } catch (error) {
    console.error(error);
    return res.status(500).send(error.message);
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

    // Assuming you want to send the created test document back in the response
    res.status(200).send(test);
  } catch (error) {
    console.error(error);

    if (error.code == 11000) {
      res.status(500).send(error);
    } else {
      res.status(500).send("An error occurred while processing your request.");
    }
  }
};
  

module.exports.test_getByID = async (req, res) => {
  console.log(req.params);

  const result = await Test.findById(req.params.id).exec();

  if (result != null) {
    res.status(200).send(result);
  } else {
    res.status(500).send("test not found");
  }
};

module.exports.test_getAllByUser = async (req, res) => {
  console.log(req.params);

  const result = await Test.find({ userID: req.params.userID }).exec();

  if (result != null) {
    res.status(200).send(result);
  } else {
    res.status(500).send("no tests found");
  }
};
