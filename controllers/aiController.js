const jwt = require("jsonwebtoken");
const Test = require("../models/Test");
const User = require("../models/User");
const dotenv = require("dotenv");
const { OpenAI } = require("openai");

dotenv.config();

module.exports.getAIWordList = async (req, res) => {
  let token = req.cookies["auth-token"];

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

    let aiTestWords = user.nextAITest;
    console.log(aiTestWords);

    if (aiTestWords) {
      res.status(200).send(aiTestWords);
    } else {
      throw new Error("No AI test words available.");
    }
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      res.status(400).send("Invalid token.");
    } else if (error.name === "TokenExpiredError") {
      res.status(401).send("Token expired.");
    } else {
      console.error(error);
      res.status(500).send("An error occurred while processing your request.");
    }
  }
};

module.exports.ai_getAnalysis = async (req, res) => {
  let token = req.cookies["auth-token"];

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

    let mostRecentTests = await Test.find({ userID: _id })
      .select("eventLog")
      .sort({ timestamp: -1 })
      .limit(3);

    if (!mostRecentTests || mostRecentTests.length === 0) {
      return res.status(401).send("User has not taken any tests.");
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const eventLogs = mostRecentTests.map((test) => test.eventLog);
    const flattenedEventLogs = eventLogs.flat();

    const chunkContent = JSON.stringify(flattenedEventLogs);

    const prompt = `
You will be provided with eventLogs from typing tests. Follow the instructions exactly and do not use any discretion.

Instructions:
1. Examine the 'eventlog' objects.
2. For each event, compare the 'intended' letter with the 'typed' letter.
3. If the 'intended' letter does not match the 'typed' letter, increment a counter for the 'intended' letter.
4. Keep a detailed record of each 'intended' letter and the letters it was mistyped as, along with their frequencies.
5. After processing all events, generate a JSON object with the letters sorted by their mistype count in descending order.
6. Provide exactly 50 practice words containing at least two of the top 5 most mistyped letters.

Respond in this JSON format:
{
  "mistakes": [
    {
      "letter": "i",
      "mistype_count": 5,
      "mistyped_as": ["t", "g", "r", "u", "o", "Backspace", "c"],
      "possible_reason": "The letter 'i' is often typed with the right index finger. The user's hand positioning or finger accuracy might be causing these mistakes."
    },
    {
      "letter": "z",
      "mistype_count": 3,
      "mistyped_as": ["l", "Backspace", "other incorrect characters"],
      "possible_reason": "The letter 'z' is less common in daily typing, possibly leading to weaker muscle memory for this letter."
    }
  ],
  "practiceWords": [
    "example", "words", "containing", "mistyped", "letters"
  ]
}

Below are the eventLogs from the typing tests:

${chunkContent}
`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content:
              "You are an AI typing data analyst. Your goal is to analyze a user's typing performance from a JSON object.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 1800,
        temperature: 0.1,
        top_p: 0.8,
      });

      let jsonResponse;
      try {
        // Strip code block delimiters
        const rawContent = response.choices[0].message.content;
        const jsonContent = rawContent
          .replace(/^```json\s*/i, "")
          .replace(/```$/, "");
        jsonResponse = JSON.parse(jsonContent);
      } catch (parseError) {
        console.error("Failed to parse JSON response from OpenAI:", parseError);
        console.error("Raw response:", response.choices[0].message.content);
        return res
          .status(500)
          .send("Failed to parse JSON response from OpenAI.");
      }

      const sortedMistakes = jsonResponse.mistakes.sort(
        (a, b) => b.mistype_count - a.mistype_count
      );

      const top5Mistakes = sortedMistakes.slice(0, 5);
      const top5Letters = top5Mistakes.map((mistake) => mistake.letter);

      const practiceWords = jsonResponse.practiceWords.filter((word) => {
        const wordLetters = new Set(word);
        let count = 0;
        top5Letters.forEach((letter) => {
          if (wordLetters.has(letter)) count++;
        });
        return count >= 2;
      });

      if (practiceWords.length < 50) {
        const additionalWords = jsonResponse.practiceWords.filter(
          (word) =>
            !practiceWords.includes(word) &&
            word.split("").filter((letter) => top5Letters.includes(letter))
              .length >= 2
        );
        practiceWords.push(
          ...additionalWords.slice(0, 50 - practiceWords.length)
        );
      } else {
        practiceWords = practiceWords.slice(0, 50);
      }

      const validatedPracticeWords = practiceWords.filter((word) => {
        const wordLetters = new Set(word);
        let count = 0;
        top5Letters.forEach((letter) => {
          if (wordLetters.has(letter)) count++;
        });
        return count >= 2;
      });

      const finalResult = {
        mistakes: top5Mistakes,
        practiceWords: validatedPracticeWords.slice(0, 50),
      };

      user.nextAITest = { practiceWords: finalResult.practiceWords };
      await user.save();

      console.log(finalResult);
      res.status(200).send(finalResult);

      const usage = response.usage;
      const totalTokens = usage.total_tokens;
      console.log(`Total tokens used: ${totalTokens}`);
      console.log(`Prompt tokens: ${usage.prompt_tokens}`);
      console.log(`Completion tokens: ${usage.completion_tokens}`);
    } catch (aiError) {
      console.log("Error in OpenAI API response:", aiError);

      if (aiError.response && aiError.response.data) {
        console.error("OpenAI API error response:", aiError.response.data);
      }

      res.status(500).send("An error occurred while processing AI analysis.");
    }
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      res.status(400).send("Invalid token.");
    } else if (error.name === "TokenExpiredError") {
      res.status(401).send("Token expired.");
    } else {
      console.error("Server error:", error);
      res.status(500).send("An error occurred.");
    }
  }
};
