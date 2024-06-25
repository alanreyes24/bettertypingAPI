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
            "You are an AI typing data analyst. Your goal is to analyze a user's typing performance from a JSON object. Pay attention to what letters and letter combinations the user struggles with and with that in mind generate 50 words that would be good for the user to practice with. Return with a string with each word separated by a comma. Give your reasoning as to why you chose each word and how it connects to an error the user made in their typing tests",
        },
        {
          role: "user",
          content:
            "This JSON file contains 3 tests and is what you'll be analyzing as an AI typing data analyst: " +
            mostRecentTests,
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
