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
  // let errors = { username: "", password: "" };
  let errors = err.message;

  if (err.message.includes("User validation failed: ")) {
    if (
      err.message.includes(
        "User validation failed: username could not be found"
      )
    ) {
      errors = "Your username / password was incorrect";
    }
    if (
      err.message.includes(
        "User validation failed: password: Minimum password length is 6 characters"
      )
    ) {
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
  res.send("login get (shouldnt exist)");
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
      console.log("invalid pass"); // also not even sure we're supposed to let them know that the password didn't match
      return res.status(400).json("password is incorrect"); // aren't i suppsoed to throw error instead?
    }

    const token = generateAuthToken(user);
    res.header("auth-token", token).send({ token });
  } catch (err) {
    const errors = handleErrors(err);
    res.status(400).json(errors);
  }
};
