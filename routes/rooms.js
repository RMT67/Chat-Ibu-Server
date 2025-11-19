const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/authentication");
const { requireAdmin } = require("../middleware/adminAuth");
const roomController = require("../controllers/roomController");

// All routes require authentication
router.get("/:id", authenticate, roomController.getRoomById);

module.exports = router;
