const express = require("express");
const cors = require("cors");
const http = require("http");
require("dotenv").config();

const routes = require("./routes");
const errorHandler = require("./middleware/errorHandler");
const socketService = require("./services/socketService");

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
socketService.initializeSocket(server);

// Store io instance in app for access in controllers
app.set("io", socketService.getIO());

// Middleware
const allowedOrigins = [
  process.env.CLIENT_URL || "http://localhost:5173",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(null, true); // Allow all origins in development
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// Root route
app.get("/", (req, res) => {
  res.json({
    message: "Chat Ibu-Ibu API Server",
    version: "1.0.0",
    endpoints: {
      health: "/health",
      api: "/api",
      auth: {
        register: "POST /api/users/register",
        login: "POST /api/users/login",
      },
      users: "GET /api/users",
      chats: "GET /api/chats",
      rooms: "GET /api/rooms",
    },
    documentation: "See README.md for full API documentation",
  });
});

// Routes
app.use("/api", routes);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Error handler
app.use(errorHandler);

module.exports = { app, server };
