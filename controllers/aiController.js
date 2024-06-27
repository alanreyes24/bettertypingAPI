// aiController.js

const jwt = require("jsonwebtoken");
const Test = require("../models/Test");
const User = require("../models/User");
const dotenv = require("dotenv");
const { OpenAI } = require("openai");

dotenv.config();

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
      .select("eventLog") // Only select 'eventLog' field
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
    const chunkSize = Math.ceil(flattenedEventLogs.length / 5);
    const eventLogChunks = [];

    // Split the flattened event logs into 5 equal chunks
    for (let i = 0; i < 5; i++) {
      eventLogChunks.push(
        flattenedEventLogs.slice(i * chunkSize, (i + 1) * chunkSize)
      );
    }

    const combinedMistakes = {};
    const combinedPracticeWords = new Set();
    let totalTokens = 0;

    for (const chunk of eventLogChunks) {
      const chunkContent = JSON.stringify(chunk);

      const prompt = `
You will be provided with a portion of eventLogs from typing tests. Follow the instructions exactly and do not use any discretion.

Instructions:
1. Examine the 'eventlog' objects.
2. For each event, compare the 'intended' letter with the 'typed' letter.
3. If the 'intended' letter does not match the 'typed' letter, increment a counter for the 'intended' letter.
4. Keep a detailed record of each 'intended' letter and the letters it was mistyped as, along with their frequencies.
5. After processing all events, generate a JSON object with the letters sorted by their mistype count in descending order.
6. Provide 25 practice words containing at least one of the mistyped letters.

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
        max_tokens: 2000,
        temperature: 0.1, // Lower temperature for more deterministic output
        top_p: 0.8, // Lower top_p for more deterministic output
      });

      const jsonResponse = JSON.parse(response.choices[0].message.content);

      // Aggregate mistakes
      jsonResponse.mistakes.forEach((mistake) => {
        if (combinedMistakes[mistake.letter]) {
          combinedMistakes[mistake.letter].mistype_count +=
            mistake.mistype_count;
          combinedMistakes[mistake.letter].mistyped_as = Array.from(
            new Set([
              ...combinedMistakes[mistake.letter].mistyped_as,
              ...mistake.mistyped_as,
            ])
          );
        } else {
          combinedMistakes[mistake.letter] = mistake;
        }
      });

      // Aggregate practice words
      jsonResponse.practiceWords.forEach((word) =>
        combinedPracticeWords.add(word)
      );

      const usage = response.usage;
      totalTokens += usage.total_tokens;
      console.log(`Tokens used for this chunk: ${usage.total_tokens}`);
      console.log(`Prompt tokens: ${usage.prompt_tokens}`);
      console.log(`Completion tokens: ${usage.completion_tokens}`);
    }

    // Convert aggregated mistakes to an array and sort by mistype_count
    const aggregatedMistakesArray = Object.values(combinedMistakes).sort(
      (a, b) => b.mistype_count - a.mistype_count
    );

    // Keep only the top 5 most mistyped letters
    const top5Mistakes = aggregatedMistakesArray.slice(0, 5);

    // Filter practice words to include only those containing at least one of the top 5 most mistyped letters
    const top5Letters = top5Mistakes.map((mistake) => mistake.letter);
    const filteredPracticeWords = Array.from(combinedPracticeWords).filter(
      (word) => top5Letters.some((letter) => word.includes(letter))
    );

    const finalResult = {
      mistakes: top5Mistakes,
      practiceWords: filteredPracticeWords,
    };

    res.status(200).send(finalResult);
    console.log(finalResult);
    console.log(`Total tokens used: ${totalTokens}`);
  } catch (error) {
    console.log(error);
    res.status(500).send("An error occurred");
  }
};
