const path = require("path");
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const compression = require("compression");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const logger = require("./utils/logger");
const ApiError = require("./utils/ApiError");

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL || "*",
    credentials: true
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(compression());
app.use(cookieParser());
app.use(morgan("combined"));

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200
  })
);

const uploadDir = path.join(process.cwd(), process.env.UPLOAD_DIR || "uploads");
app.use("/uploads", express.static(uploadDir));

app.use("/api/v1/auth", require("./routes/authRoutes"));
app.use("/api/v1/servants", require("./routes/servantRoutes"));
app.use("/api/v1/bookings", require("./routes/bookingRoutes"));
app.use("/api/v1/time", require("./routes/timeRoutes"));
app.use("/api/v1/agent", require("./routes/agentRoutes"));
app.use("/api/v1/admin", require("./routes/adminRoutes"));
app.use("/api/v1/notifications", require("./routes/notificationRoutes"));
app.use("/api/v1/zones", require("./routes/zoneRoutes"));
app.use("/api/v1/geo", require("./routes/geoRoutes"));

app.get("/", (req, res) => {
  res.json({ success: true, message: "StaffEra API Running" });
});

app.use((err, req, res, next) => {
  logger.error(err.message, { stack: err.stack, path: req.path });

  if (err.code === "P2002") {
    const fields = err.meta?.target || ["field"];
    const field = Array.isArray(fields) ? fields.join(", ") : fields;
    return res.status(400).json({
      success: false,
      message: `A record with this ${field} already exists`
    });
  }

  const status = err.statusCode || err.status || 500;
  res.status(status).json({
    success: false,
    message: err.message || "Internal Server Error"
  });
});

module.exports = app;
