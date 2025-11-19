const express = require("express");
const router = express.Router();

const userRoutes = require("./users");
const chatRoutes = require("./chats");
const roomRoutes = require("./rooms");

// Main routes
router.use("/users", userRoutes);
router.use("/chats", chatRoutes);
router.use("/rooms", roomRoutes);

module.exports = router;
