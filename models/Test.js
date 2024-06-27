const mongoose = require("mongoose");

// Define the Words sub-schema
const wordsSchema = new mongoose.Schema({
  wordsList: {
    type: [String],
    required: true,
    default: [],
  },
  correctLetters: {
    type: Object,
    default: {},
  },
  incorrectLetters: {
    type: Object,
    default: {},
  },
  trueWPMArray: {
    type: Array,
    default: [],
  },
  rawWPMArray: {
    type: Array,
    default: [],
  },
});

// Define the Settings sub-schema
const settingsSchema = new mongoose.Schema({
  type: { type: String, required: true, default: "time" },
  length: { type: Number, required: true, default: 0 },
  count: { type: Number, required: true, default: 0 },
  difficulty: { type: String, required: true, default: "normal" },
});

// Define the Results sub-schema
const resultsSchema = new mongoose.Schema({
  correctOnlyWPM: { type: Number, required: true, default: 0 },
  rawWPM: { type: Number, required: true, default: 0 },
  trueWPM: { type: Number, required: true, default: 0 },
  accuracy: { type: Number, required: true, default: 0 },
});

// Define the main Test schema
const testSchema = new mongoose.Schema({
  userID: {
    type: String,
    required: true,
  },
  username: {
    type: String,
    // required: true,
  },
  timestamp: {
    type: Number,
    required: true,
  },
  words: {
    type: wordsSchema,
    required: true,
  },
  settings: {
    type: settingsSchema,
    required: true,
  },
  results: {
    type: resultsSchema,
    required: true,
  },
  eventLog: {
    type: Array,
    default: [],
    required: true,
  },
});

module.exports = mongoose.model("Test", testSchema);
