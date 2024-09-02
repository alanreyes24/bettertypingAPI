const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const cookieParser = require("cookie-parser");

dotenv.config();

const authRoutes = require("./routes/authRoutes");
const testRoutes = require("./routes/testRoutes");
const aiRoutes = require("./routes/aiRoutes");
const aiTestRoutes = require("./routes/AITestRoutes");
const app = express();

// Middleware
app.use(express.static("public"));
app.use(express.json());
app.use(cookieParser());

// Add CORS middleware
const allowedOrigins = [
  "http://localhost:5173",
  "https://bettertyping-production.up.railway.app",
  "https://bettertyping.net",
];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true, // Allow cookies to be sent
  })
);

// Database connection
mongoose.set("strictQuery", false);

mongoose
  .connect(process.env.CONNECT_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then((result) => {
    const PORT = process.env.PORT || 3090; // Use the PORT provided by Railway or fallback to 3090
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => console.log(err));

// Routes
app.get("/", (req, res) => res.send("404 page not found"));
app.use(authRoutes);
app.use(testRoutes);
app.use(aiRoutes);
app.use(aiTestRoutes);

// Basic Test Endpoint
app.get("/ping", (req, res) => {
  res.send("pong");
});
