const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");

dotenv.config();

const authRoutes = require("./routes/authRoutes");
const testRoutes = require("./routes/testRoutes");

const app = express();

// Middleware
app.use(express.static("public"));
app.use(express.json());

// Add CORS middleware
app.use(cors());

// Database connection
mongoose.set("strictQuery", false);

mongoose
  .connect(process.env.CONNECT_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then((result) => app.listen(3090))
  .catch((err) => console.log(err));

// Routes
app.get("/", (req, res) => res.send("404 page not found"));
app.use(authRoutes);
app.use(testRoutes);
