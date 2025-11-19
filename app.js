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
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
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
