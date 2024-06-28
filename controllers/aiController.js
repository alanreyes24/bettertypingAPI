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

    // Define the number of chunks to split the data into
    const totalChunks = 5;
    const eventLogChunks = Array.from({ length: totalChunks }, () => []);

    // Distribute events evenly across chunks using a round-robin method
    flattenedEventLogs.forEach((event, index) => {
      const chunkIndex = index % totalChunks;
      eventLogChunks[chunkIndex].push(event);
    });

    // Initialize objects to store combined results
    const combinedMistakes = {};
    const combinedPracticeWords = new Set();
    let totalTokens = 0;

    // Process each chunk
    for (const chunk of eventLogChunks) {
      const chunkContent = JSON.stringify(chunk);

      // Construct the prompt for OpenAI
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

        const jsonResponse = JSON.parse(response.choices[0].message.content);

        // Aggregate mistakes from the current chunk into the combinedMistakes object
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

        // Aggregate practice words into the combinedPracticeWords set
        jsonResponse.practiceWords.forEach((word) =>
          combinedPracticeWords.add(word)
        );

        const usage = response.usage;
        totalTokens += usage.total_tokens;
        console.log(`Tokens used for this chunk: ${usage.total_tokens}`);
        console.log(`Prompt tokens: ${usage.prompt_tokens}`);
        console.log(`Completion tokens: ${usage.completion_tokens}`);
      } catch (aiError) {
        console.log("Error in OpenAI API response:", aiError);
      }
    }

    // Convert the combined mistakes object to an array and sort by mistype count in descending order
    const aggregatedMistakesArray = Object.values(combinedMistakes).sort(
      (a, b) => b.mistype_count - a.mistype_count
    );

    // Select the top 5 most mistyped letters
    const top5Mistakes = aggregatedMistakesArray.slice(0, 5);
    const top5Letters = top5Mistakes.map((mistake) => mistake.letter);

    // Filter practice words to include only those containing at least one of the top 5 most mistyped letters
    const filteredPracticeWords = Array.from(combinedPracticeWords).filter(
      (word) => top5Letters.some((letter) => word.includes(letter))
    );

    // Prepare the final result object
    const finalResult = {
      mistakes: top5Mistakes,
      practiceWords: filteredPracticeWords,
    };

    // Update the user's nextAITest field with the filteredPracticeWords
    user.nextAITest = { practiceWords: filteredPracticeWords };
    await user.save(); // Save the user document with the updated nextAITest field

    // Send the final result as a response
    res.status(200).send(finalResult);
    console.log(finalResult);
    console.log(`Total tokens used: ${totalTokens}`);
  } catch (error) {
    console.log("Server error:", error);
    res.status(500).send("An error occurred");
  }
};
