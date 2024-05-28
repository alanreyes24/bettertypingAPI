const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

const authRoutes = require("./routes/authRoutes");

const app = express();

// middleware
app.use(express.static("public"));
app.use(express.json());

// database connection

mongoose
  .connect(process.env.CONNECT_URI, { useNewUrlParser: true })
  .then((result) => app.listen(3090))
  .catch((err) => console.log(err));

// routes
app.get("/", (req, res) => res.send("404 page not found"));

app.use(authRoutes);
