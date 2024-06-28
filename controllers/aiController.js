const jwt = require("jsonwebtoken");
const Test = require("../models/Test");
const User = require("../models/User");
const dotenv = require("dotenv");
const { OpenAI } = require("openai");

dotenv.config();

module.exports.ai_getAnalysis = async (req, res) => {
  // Retrieve the JWT token from cookies
  let token = req.cookies["auth-token"];

  // If no token is found, return an access denied response
  if (!token) {
    return res.status(401).send("Access denied. No token provided.");
  }

  try {
    // Verify and decode the JWT token
    const decoded = jwt.verify(token, process.env.TOKEN_SECRET);
    const _id = decoded._id;

    // Find the user by ID in the database
    const user = await User.findOne({ _id: _id });

    // If user is not found, return a 404 response
    if (!user) {
      return res.status(404).send("User not found.");
    }

    // Fetch the three most recent typing tests of the user, selecting only the 'eventLog' field
    let mostRecentTests = await Test.find({ userID: _id })
      .select("eventLog")
      .sort({ timestamp: -1 })
      .limit(3);

    // If no tests are found, return a 401 response
    if (!mostRecentTests || mostRecentTests.length === 0) {
      return res.status(401).send("User has not taken any tests.");
    }

    // Initialize OpenAI with the API key from environment variables
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Extract event logs from the most recent tests and flatten them into a single array
    const eventLogs = mostRecentTests.map((test) => test.eventLog);
    const flattenedEventLogs = eventLogs.flat();

    // Convert the entire data to a single chunk
    const chunkContent = JSON.stringify(flattenedEventLogs);

    // Construct the prompt for OpenAI
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
      // Call OpenAI API with the prompt and get the response
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
        max_tokens: 3500,
        temperature: 0.1,
        top_p: 0.8,
      });

      // Validate and parse the response
      let jsonResponse;
      try {
        jsonResponse = JSON.parse(response.choices[0].message.content);
      } catch (parseError) {
        console.error("Failed to parse JSON response from OpenAI:", parseError);
        console.error("Raw response:", response.choices[0].message.content);
        return res
          .status(500)
          .send("Failed to parse JSON response from OpenAI.");
      }

      // Extract mistakes and sort by mistype count in descending order
      const sortedMistakes = jsonResponse.mistakes.sort(
        (a, b) => b.mistype_count - a.mistype_count
      );

      // Select the top 5 most mistyped letters
      const top5Mistakes = sortedMistakes.slice(0, 5);
      const top5Letters = top5Mistakes.map((mistake) => mistake.letter);

      // Filter practice words to include only those containing at least two of the top 5 most mistyped letters
      const practiceWords = jsonResponse.practiceWords.filter((word) => {
        const wordLetters = new Set(word);
        let count = 0;
        top5Letters.forEach((letter) => {
          if (wordLetters.has(letter)) count++;
        });
        return count >= 2;
      });

      // Ensure we have exactly 50 practice words
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

      // Ensure all words have at least two of the top 5 most mistyped letters
      const validatedPracticeWords = practiceWords.filter((word) => {
        const wordLetters = new Set(word);
        let count = 0;
        top5Letters.forEach((letter) => {
          if (wordLetters.has(letter)) count++;
        });
        return count >= 2;
      });

      // If after validation we don't have 50 words, fill up with dummy words or handle as needed
      while (validatedPracticeWords.length < 50) {
        validatedPracticeWords.push("dummyword"); // Add your logic to handle insufficient words
      }

      // Prepare the final result object
      const finalResult = {
        mistakes: top5Mistakes,
        practiceWords: validatedPracticeWords.slice(0, 50),
      };

      // Update the user's nextAITest field with the practiceWords
      user.nextAITest = { practiceWords: finalResult.practiceWords };
      await user.save(); // Save the user document with the updated nextAITest field

      // Send the final result as a response
      res.status(200).send(finalResult);
      console.log(finalResult);

      // Log the token usage
      const usage = response.usage;
      const totalTokens = usage.total_tokens;
      console.log(`Total tokens used: ${totalTokens}`);
      console.log(`Prompt tokens: ${usage.prompt_tokens}`);
      console.log(`Completion tokens: ${usage.completion_tokens}`);
    } catch (aiError) {
      console.log("Error in OpenAI API response:", aiError);
      res.status(500).send("An error occurred while processing AI analysis.");
    }
  } catch (error) {
    console.log("Server error:", error);
    res.status(500).send("An error occurred");
  }
};
