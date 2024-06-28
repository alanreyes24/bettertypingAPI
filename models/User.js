const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const nextAITestSchema = new mongoose.Schema({
  practiceWords: {
    type: [String], // Array of strings
    required: false,
  },
});

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, "Please enter a username"],
    unique: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: [true, "Please enter a password"],
    minlength: [6, "Minimum password length is 6 characters"],
  },
  nextAITest: {
    type: nextAITestSchema,
    required: false,
  },
});

// Password hashing
userSchema.pre("save", async function (next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified("password")) return next();

  const salt = await bcrypt.genSalt();
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

const User = mongoose.model("User", userSchema);

module.exports = User;
