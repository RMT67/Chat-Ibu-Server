const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");

// Authentication endpoints (no auth required)
router.post("/register", userController.register);
router.post("/login", userController.login);

// User endpoints (require authentication)
router.get("/", authenticate, userController.getUsers);
router.get("/:id", authenticate, userController.getUserById);
router.put("/:id", authenticate, userController.updateUser);
router.patch(
  "/:id/online-status",
  authenticate,
  userController.updateOnlineStatus
);

module.exports = router;
