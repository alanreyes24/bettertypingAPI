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

module.exports.logout = async (req, res) => {
  
  try {

   res.clearCookie('auth-token', {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // Match the setting when the cookie was set
    sameSite: 'Strict' // Optionally, you might need to match this as well
  });

  res.status(204).send()


  } catch (error) {

    console.log(error)

  } 
}

module.exports.tokenCheck = async (req, res) => {
  
  const token = req.cookies["auth-token"];

  if (!token) {
    return res.status(401).send("No token provided.");
  }

  try {

    const decoded = jwt.verify(token, process.env.TOKEN_SECRET);

    const _id = decoded._id;

    const user = await User.findOne({ _id: _id });

    res.status(200).json({ _id: user._id, username: user.username });

  } catch (error) {
    console.log(error);
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).send("Token has expired.");
    } else if (error instanceof jwt.JsonWebTokenError) {
      return res.status(403).send("Invalid token.");
    } else {
      return res.status(500).send("An unexpected error occurred.");
    }
  }
}



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
    }).json({ userID: user._id, username: user.username });
  } catch (err) {
    console.log(error)
    const errors = handleErrors(err);
    res.status(400).json(errors);
  }
};
