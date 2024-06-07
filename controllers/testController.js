const Test = require("../models/Test");

module.exports.test_post = async (req, res) => {
  const passedTest = req.body;
  console.log(passedTest);

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
