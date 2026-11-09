
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import healthRoutes from "./routes/health.routes.js";

dotenv.config();

const app = express();

const PORT = process.env.PORT || 5000;

const allowedOrigins = (
  process.env.CLIENT_ORIGINS ||
  "http://localhost:5173,http://localhost:5174"
).split(",").map(origin => origin.trim());

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("Origin not allowed by CORS."));
  },
  credentials: true
}));

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Hospital Medical Records System API"
  });
});

// Health check
app.use("/api/health", healthRoutes);

// Invalid route handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found."
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error(error);

  res.status(500).json({
    success: false,
    message: "Internal server error."
  });
});

app.listen(PORT, () => {
  console.log(`Hospital API running at http://localhost:${PORT}`);
});
