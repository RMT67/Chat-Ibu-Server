const { Server } = require("socket.io");
const { Chat, User, Room } = require("../models");
const { verifyToken } = require("../helpers/jwt");

let io;

// Rate limiting storage
const rateLimitMap = new Map();
const RATE_LIMIT = {
  MESSAGE: { max: 10, window: 60000 }, // 10 messages per minute
  TYPING: { max: 30, window: 60000 }, // 30 typing events per minute
  JOIN: { max: 5, window: 60000 }, // 5 joins per minute
};

// Helper function untuk rate limiting
const checkRateLimit = (socketId, type) => {
  const now = Date.now();
  const key = `${socketId}:${type}`;
  const limit = RATE_LIMIT[type];

  if (!rateLimitMap.has(key)) {
    rateLimitMap.set(key, { count: 1, resetTime: now + limit.window });
    return true;
  }

  const record = rateLimitMap.get(key);

  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + limit.window;
    return true;
  }

  if (record.count >= limit.max) {
    return false;
  }

  record.count++;
  return true;
};

// Helper function untuk sanitize message
const sanitizeMessage = (message) => {
  if (typeof message !== "string") return "";
  // Remove HTML tags and trim
  return message.replace(/<[^>]*>/g, "").trim();
};

// Helper function untuk validasi input
const validateInput = (data, schema) => {
  for (const [key, validator] of Object.entries(schema)) {
    if (validator.required && (data[key] === undefined || data[key] === null)) {
      return { valid: false, error: `${key} is required` };
    }
    if (
      data[key] !== undefined &&
      validator.type &&
      typeof data[key] !== validator.type
    ) {
      return { valid: false, error: `${key} must be ${validator.type}` };
    }
    if (
      data[key] !== undefined &&
      validator.validate &&
      !validator.validate(data[key])
    ) {
      return { valid: false, error: validator.error || `${key} is invalid` };
    }
  }
  return { valid: true };
};

// Socket.IO authentication middleware
const authenticateSocket = async (socket, next) => {
  try {
    // Try to get token from auth object first, then from Authorization header
    let token = socket.handshake.auth?.token;

    if (!token && socket.handshake.headers?.authorization) {
      const authHeader = socket.handshake.headers.authorization;
      if (authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      return next(new Error("Authentication token required"));
    }

    try {
      const decoded = verifyToken(token);
      const user = await User.findByPk(decoded.id);

      if (!user) {
        return next(new Error("User not found"));
      }

      // Attach user to socket
      socket.user = user;
      socket.userId = user.id;
      next();
    } catch (error) {
      return next(new Error("Invalid or expired token"));
    }
  } catch (error) {
    return next(new Error("Authentication failed"));
  }
};

const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      methods: ["GET", "POST"],
      credentials: true,
    },
    allowEIO3: true,
  });

  // Apply authentication middleware
  io.use(authenticateSocket);

  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.userId} (${socket.id})`);

    // Store authenticated user ID
    const authenticatedUserId = socket.userId;

    // Join room with validation
    socket.on("join:room", async (data) => {
      try {
        // Rate limiting
        if (!checkRateLimit(socket.id, "JOIN")) {
          socket.emit("error", {
            message: "Too many join requests. Please wait.",
          });
          return;
        }

        // Validate input
        const validation = validateInput(data, {
          roomId: {
            required: true,
            type: "number",
            validate: (val) => Number.isInteger(val) && val > 0,
            error: "roomId must be a positive integer",
          },
        });

        if (!validation.valid) {
          socket.emit("error", { message: validation.error });
          return;
        }

        const { roomId } = data;

        // Verify room exists and is active
        const room = await Room.findByPk(roomId);
        if (!room) {
          socket.emit("error", { message: "Room not found" });
          return;
        }

        if (!room.isActive) {
          socket.emit("error", { message: "Room is inactive" });
          return;
        }

        // Join room
        const roomKey = `room-${roomId}`;
        socket.join(roomKey);

        // Update user online status (only for authenticated user)
        const user = await User.findByPk(authenticatedUserId);
        if (user) {
          user.isOnline = true;
          user.lastSeen = new Date();
          await user.save();

          // Broadcast user online (without email for privacy)
          io.emit("user:online", {
            userId: user.id,
            isOnline: true,
            user: {
              id: user.id,
              name: user.name,
              photoUrl: user.photoUrl,
              isOnline: true,
            },
          });
        }

        // Send chat history for this room
        const chats = await Chat.findAll({
          where: { RoomId: roomId },
          include: [
            { model: User, attributes: ["id", "name", "photoUrl"] },
            { model: Room, attributes: ["id", "name"] },
          ],
          order: [["createdAt", "DESC"]],
          limit: 50,
        });

        socket.emit("chat:history", { messages: chats.reverse(), roomId });

        // Send list of online users (without email)
        const onlineUsers = await User.findAll({
          where: { isOnline: true },
          attributes: ["id", "name", "photoUrl", "isOnline"],
        });
        socket.emit("users:online", { users: onlineUsers });
      } catch (error) {
        console.error("Error in join:room:", error);
        socket.emit("error", { message: "Failed to join room" });
      }
    });

    // Handle new message with full security
    socket.on("chat:message", async (data) => {
      try {
        // Rate limiting
        if (!checkRateLimit(socket.id, "MESSAGE")) {
          socket.emit("error", {
            message: "Too many messages. Please slow down.",
          });
          return;
        }

        // Validate input
        const validation = validateInput(data, {
          message: {
            required: true,
            type: "string",
            validate: (val) => {
              const sanitized = sanitizeMessage(val);
              return sanitized.length > 0 && sanitized.length <= 5000;
            },
            error: "Message must be between 1 and 5000 characters",
          },
          roomId: {
            required: true,
            type: "number",
            validate: (val) => Number.isInteger(val) && val > 0,
            error: "roomId must be a positive integer",
          },
        });

        if (!validation.valid) {
          socket.emit("error", { message: validation.error });
          return;
        }

        const { message, roomId } = data;

        // Sanitize message
        const sanitizedMessage = sanitizeMessage(message);

        if (sanitizedMessage.length === 0) {
          socket.emit("error", { message: "Message cannot be empty" });
          return;
        }

        // Verify room exists and is active
        const room = await Room.findByPk(roomId);
        if (!room) {
          socket.emit("error", { message: "Room not found" });
          return;
        }

        if (!room.isActive) {
          socket.emit("error", { message: "Room is inactive" });
          return;
        }

        // Verify user is authenticated (use authenticated user ID, not from client)
        if (!authenticatedUserId) {
          socket.emit("error", { message: "Unauthorized" });
          return;
        }

        // Save to database using authenticated user ID
        const chat = await Chat.create({
          UserId: authenticatedUserId, // Use authenticated user ID, not from client
          message: sanitizedMessage,
          RoomId: roomId,
        });

        // Load with associations
        const chatWithUser = await Chat.findByPk(chat.id, {
          include: [
            { model: User, attributes: ["id", "name", "photoUrl"] },
            { model: Room, attributes: ["id", "name"] },
          ],
        });

        // Broadcast to all users in the room
        const roomKey = `room-${roomId}`;
        io.to(roomKey).emit("chat:new_message", chatWithUser);
      } catch (error) {
        console.error("Error sending message:", error);
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    // Handle typing indicator with validation
    const typingUsers = new Map();

    socket.on("typing:start", (data) => {
      try {
        // Rate limiting
        if (!checkRateLimit(socket.id, "TYPING")) {
          return; // Silently ignore if rate limited
        }

        // Validate input
        const validation = validateInput(data, {
          roomId: {
            required: true,
            type: "number",
            validate: (val) => Number.isInteger(val) && val > 0,
            error: "roomId must be a positive integer",
          },
        });

        if (!validation.valid) {
          return; // Silently ignore invalid input
        }

        const { roomId } = data;

        // Verify room exists
        Room.findByPk(roomId)
          .then((room) => {
            if (room && room.isActive) {
              typingUsers.set(`${socket.id}:${roomId}`, true);
              const roomKey = `room-${roomId}`;
              socket.broadcast.to(roomKey).emit("typing:indicator", {
                userId: authenticatedUserId, // Use authenticated user ID
                isTyping: true,
              });
            }
          })
          .catch(() => {
            // Silently ignore errors
          });
      } catch (error) {
        // Silently ignore errors for typing indicator
      }
    });

    socket.on("typing:stop", (data) => {
      try {
        // Validate input
        if (!data || typeof data.roomId !== "number") {
          return; // Silently ignore invalid input
        }

        const { roomId } = data;

        typingUsers.delete(`${socket.id}:${roomId}`);
        const roomKey = `room-${roomId}`;
        socket.broadcast.to(roomKey).emit("typing:indicator", {
          userId: authenticatedUserId, // Use authenticated user ID
          isTyping: false,
        });
      } catch (error) {
        // Silently ignore errors for typing indicator
      }
    });

    // Handle disconnect
    socket.on("disconnect", async () => {
      console.log(`User disconnected: ${authenticatedUserId} (${socket.id})`);

      // Update user offline status
      if (authenticatedUserId) {
        try {
          await User.update(
            { isOnline: false, lastSeen: new Date() },
            { where: { id: authenticatedUserId } }
          );

          // Broadcast user offline to all clients
          io.emit("user:offline", {
            userId: authenticatedUserId,
            isOnline: false,
          });
        } catch (error) {
          console.error("Error updating user offline status:", error);
        }
      }

      // Clean up rate limiting
      const keysToDelete = [];
      for (const key of rateLimitMap.keys()) {
        if (key.startsWith(`${socket.id}:`)) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach((key) => rateLimitMap.delete(key));
    });
  });

  return io;
};

const getIO = () => io;

module.exports = {
  initializeSocket,
  getIO,
};
