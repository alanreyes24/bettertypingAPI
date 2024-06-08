const Test = require("../models/Test");

module.exports.test_post = async (req, res) => {
  const passedTest = req.body;
  try {
    const test = await Test.create({
      userID: passedTest.userID,
      words: {
        wordsList: passedTest.words.wordList,
        correctLetters: passedTest.words.correctLetters,
        incorrectLetters: passedTest.words.incorrectLetters,
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
    });

    // console.log(passedTest.eventLog);

    // Assuming you want to send the created test document back in the response
    res.send(test);
  } catch (error) {
    console.error(error);

    if (error.code == 11000) {
      res.status(500).send("NOT UNIQUE");
    } else {
      res.status(500).send("An error occurred while processing your request.");
    }
  }
};

module.exports.test_getByID = async (req, res) => {
  console.log(req.params);
  Test.findById(req.params.id, function (err, test) {
    if (err) {
      res.status(500).send(err);
      res.end();
    }
    if (test) {
      res.status(200).send(test);
      res.end();
    }
  });
};
