const express = require("express");
const router = express.Router();

const userRoutes = require("./users");
const chatRoutes = require("./chats");

// Main routes
router.use("/users", userRoutes);
router.use("/chats", chatRoutes);

module.exports = router;
