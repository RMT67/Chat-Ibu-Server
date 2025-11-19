const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/authentication");
const { requireAdmin } = require("../middleware/adminAuth");
const roomController = require("../controllers/roomController");

// All routes require authentication
router.get("/:id", authenticate, roomController.getRoomById);
router.get("/", authenticate, roomController.getRooms);

/ Admin-only routes
router.post('/generate-content', authenticate, requireAdmin, roomController.generateRoomContent);
router.post('/', authenticate, requireAdmin, roomController.createRoom);
router.put('/:id', authenticate, requireAdmin, roomController.updateRoom);

module.exports = router;
