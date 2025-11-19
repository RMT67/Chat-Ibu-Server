const express = require("express");
const router = express.Router();

const authRoutes = require("./auth");
const userRoutes = require("./users");

// Auth routes (backward compatibility)
router.use("/auth", authRoutes);

// Main routes
router.use("/users", userRoutes);

module.exports = router;
