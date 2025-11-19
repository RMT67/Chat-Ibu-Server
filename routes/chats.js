const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/authentication");
const chatController = require("../controllers/chatController");

router.get("/", authenticate, chatController.getChats);

module.exports = router;
