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
      .select("eventLog") // Only select 'eventLog' and 'words' fields
      .sort({ timestamp: -1 })
      .limit(3);

    if (!mostRecentTests) {
      return res.status(401).send("User has not taken any tests.");
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

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
          content:
            "I want you to look over these three typing tests I give you. You are going to look through each test's eventLog and find typing errors that happen all 3 tests try to find the most commonly mistyped letters and explain as to why the user makes that mistake. User an inner monologue for all of your thinking. Find the most commonly misspelled letters by counting how many times each letter in the alphabet gets mistyped in the eventlog. Order them from highest to lowest, if tied make also include it.. If you can't recognize more than two letters the user struggles with, don't force yourself to find more. Just state that you cannot find another letter the user struggles with. At the end include 50 words that MUST contain at least one of the mistyped letters. " +
            "Give your response in this EXACT JSON format: " +
            `{
  "mistakes": [
    {
      "letter": "i",
      "mistype_count": 5,
      "mistyped_as": ["t", "g", "r", "u", "o", "Backspace", "c"],
      "possible_reason": "The letter 'i' is a key that is often typed with the right index finger. It's possible that the user's right hand positioning or finger accuracy is causing these mistakes."
    },
    {
      "letter": "z",
      "mistype_count": 3,
      "mistyped_as": ["l", "Backspace", "other incorrect characters"],
      "possible_reason": "The letter 'z' is relatively less common in daily typing compared to other letters. The user might not have developed a strong muscle memory for this letter."
    },
    {
      "letter": "o",
      "mistype_count": 2,
      "mistyped_as": ["x", "t", "w", "k", "Backspace"],
      "possible_reason": "It seems like the user might have issues with the position of the letter 'o' on the keyboard or with distinguishing it from other nearby letters."
    }
  ],
  "practiceWords": [
    
  ]
}
`,
        },
      ],
      max_tokens: 4096,
      temperature: 1,
      top_p: 0.95,
    });

    const result = response.choices[0].message.content;

    const usage = response.usage;
    console.log(`Tokens used: ${usage.total_tokens}`);
    console.log(`Prompt tokens: ${usage.prompt_tokens}`);
    console.log(`Completion tokens: ${usage.completion_tokens}`);

    console.log(result);

    res.status(200).send(result);
  } catch (error) {
    console.log(error);
    res.status(500).send("An error occurred");
  }
};
