const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/authentication");
const chatController = require("../controllers/chatController");

router.get("/:id", authenticate, chatController.getChatById);

module.exports = router;
