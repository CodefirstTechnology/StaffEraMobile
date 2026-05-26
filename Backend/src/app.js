const express = require("express");

const helmet = require("helmet");
const cors = require("cors");
const compression = require("compression");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");

const app = express();

app.use(helmet());

app.use(cors());

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

app.use(compression());

app.use(cookieParser());

app.use(morgan("combined"));

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
}));

app.use("/api/v1/auth", require("./routes/authRoutes"));

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "API Running"
  });
});

app.use((err, req, res, next) => {
  console.error(err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error"
  });
});

module.exports = app;