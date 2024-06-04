const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// Error handler
const handleErrors = (err) => {
  console.log(err.message, err.code);
  let errors = { username: "", password: "" };

  // Validation errors
  if (err.message.includes("user validation failed")) {
    Object.values(err.errors).forEach(({ properties }) => {
      errors[properties.path] = properties.message;
    });
  }

  if (err.code === 11000) {
    errors.username = "That username is already in use";
    return errors;
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
  console.log("got a signup request with:");
  console.log(req.body);

  try {
    const user = await User.create({ username, password });
    res.status(201).json(user);
    console.log("added new user to db");
  } catch (err) {
    const errors = handleErrors(err);
    res.status(400).json(errors);
  }
};

// Login GET (for demonstration, typically not used)
module.exports.login_get = (req, res) => {
  res.send("login get (shouldnt exist)");
};

// Login POST
module.exports.login_post = async (req, res) => {
  const { username, password } = req.body;
  console.log("got a request with:");
  console.log(req.body);

  try {
    const user = await User.findOne({ username: username });
    if (!user) return res.status(400).json("username or password is incorrect");

    const validPass = await bcrypt.compare(password, user.password);
    if (!validPass) {
      console.log("invalid pass");
      return res.status(400).json("password is incorrect");
    }

    const token = jwt.sign({ _id: user._id }, process.env.TOKEN_SECRET);
    res.header("auth-token", token).send({ token });
    console.log("sent token");
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
};
