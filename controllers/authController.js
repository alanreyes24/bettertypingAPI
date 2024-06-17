const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const AppError = require("../AppError");

const generateAuthToken = (user) => {
  const token = jwt.sign({ _id: user._id }, process.env.TOKEN_SECRET, {
    expiresIn: "1h",
  });
  return token;
};

const handleErrors = (err) => {
  console.log(err.message);
  console.log(err)
  let errors = err.message;

  if (err.message.includes("User validation failed: ")) {
    if (err.message.includes("User validation failed: username could not be found")) {
      errors = "Your username / password was incorrect";
    }
    if (err.message.includes("User validation failed: password: Minimum password length is 6 characters")) {
      errors = "Your password needs to be a minimum of 6 characters";
    }
  }

  return errors;
};

// Signup GET (for demonstration, typically not used)
module.exports.signup_get = (req, res) => {
  res.send("signup get");
};

// Signup POST
module.exports.signup_post = async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.create({ username, password });
    res.status(201).json(user);
  } catch (err) {
    const errors = handleErrors(err);
    res.status(400).json(errors);
  }
};

// Login GET (for demonstration, typically not used)
module.exports.login_get = (req, res) => {
  res.send("login get (shouldn't exist)");
};

// Login POST
module.exports.login_post = async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username: username });

    if (user === null) {
      throw new AppError("User validation failed: username could not be found");
    }

    const validPass = await bcrypt.compare(password, user.password);
    if (!validPass) {
      return res.status(400).json("password is incorrect");
    }

    const token = generateAuthToken(user);
    res.cookie("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // Use secure cookies in production
      sameSite: "Strict", // or "Lax" based on your requirements
    }).json({ userId: user._id, username: user.username });
  } catch (err) {
    const errors = handleErrors(err);
    res.status(400).json(errors);
  }
};
