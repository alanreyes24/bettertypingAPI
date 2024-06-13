// testRoutes.js

const Test = require("../models/Test");
const User = require("../models/User");
const jwt = require("jsonwebtoken");

module.exports.test_getTimeTestRankings = async (req, res) => {
  try {
    // Extract the time (as duration) from the request query parameters
    let { duration } = req.query;
    duration = duration * 10;

    // Filter tests based on the nested 'settings.length' and sort by 'results.trueWPM'
    const filteredTests = await Test.aggregate([
      { $unwind: "$results" }, // unwinds the settings array / object not sure what it is considered
      { $unwind: "$settings" }, // unwinds the settings array / object not sure what it is considered
      {
        $match: {
          "settings.length": parseInt(duration), // Filter tests by nested 'settings.length'
          "settings.type": "time", // Filter tests where 'settings.type' is 'time'
        },
      },
      { $sort: { "results.trueWPM": -1 } }, // Sorts by 'results.trueWPM' in descending order
    ]);

    if (filteredTests.length === 0) {
      return res
        .status(404)
        .send("No tests found matching the specified duration");
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
  const token = req.headers["token"];

  if (!token) {
    return res.status(401).send("No token provided.");
  }

  try {
    const decoded = jwt.verify(token, process.env.TOKEN_SECRET);

    // Extract the userID from the user document
    const userID = decoded._id;
    console.log(userID);

    // Use the userID to find the corresponding test data
    const test = await Test.findOne({ userID: userID }).sort({ timestamp: -1 });

    res.status(200).send(test);
  } catch (error) {
    console.error(error);
    return res.status(500).send(error.message);
  }
};

module.exports.test_post = async (req, res) => {
  const passedTest = req.body;

  // check if user id has made a test with that same timestamp (should never happen, but should check)

  try {
    let unique = await Test.find({
      userID: passedTest.userID,
      timestamp: passedTest.timestamp,
    });

    // add unique test checking here later i guess, not sure why we need tho lowk just makes debugging harder. lowkey

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

      // console.log(passedTest.eventLog);

      // Assuming you want to send the created test document back in the response
      res.status(200).send(test);
    } catch (error) {
      console.error(error);

      if (error.code == 11000) {
        res.status(500).send(error);
      } else {
        res
          .status(500)
          .send("An error occurred while processing your request.");
      }
    }
  } catch {
    res.status(500).send(error);
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
