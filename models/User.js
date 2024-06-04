const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, "Please enter a username"],
    unique: [true, "That username is already in use"],
    lowercase: true,
  },
  password: {
    type: String,
    required: [true, "Please enter a password"],
    minlength: [6, "Password must at least 6 characters"],
  },
});

// password hashing

userSchema.pre("save", async function (next) {
  const salt = await bcrypt.genSalt();

  this.password = await bcrypt.hash(this.password, salt);
  console.log("salted password");

  next();
});

const User = mongoose.model("User", userSchema);

module.exports = User;
