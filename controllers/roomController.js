const { Room, User } = require("../models");

exports.getRooms = async (req, res, next) => {
  try {
    const { isActive, limit = 50, offset = 0 } = req.query;

    const where = {};
    if (isActive !== undefined) {
      where.isActive = isActive === "true";
    }

    const { count, rows } = await Room.findAndCountAll({
      where,
      include: [
        { model: User, as: "creator", attributes: ["id", "name", "photoUrl"] },
      ],
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      rooms: rows,
      total: count,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    next(error);
  }
};

exports.getRoomById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const room = await Room.findByPk(id, {
      include: [
        { model: User, as: "creator", attributes: ["id", "name", "photoUrl"] },
      ],
    });

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    res.json({ room });
  } catch (error) {
    next(error);
  }
};

exports.generateRoomContent = async (req, res, next) => {
  try {
    // Only admin can generate room content
    if (req.user.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Forbidden: Admin access required" });
    }

    const { generateRoomContent } = require("../services/openaiService");
    const content = await generateRoomContent();

    res.json(content);
  } catch (error) {
    next(error);
  }
};

exports.createRoom = async (req, res, next) => {
  try {
    // Only admin can create rooms
    if (req.user.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Forbidden: Admin access required" });
    }

    const { name, description, topic } = req.body;
    const { Chat } = require("../models");
    const { generateOpeningMessage } = require("../services/openaiService");

    if (!name) {
      return res.status(400).json({ message: "Room name is required" });
    }

    // Create room
    const room = await Room.create({
      name,
      description: description || null,
      topic: topic || null,
      createdBy: req.user.id,
      isActive: true,
    });

    // Generate opening message with AI and create as first chat
    try {
      const openingMessage = await generateOpeningMessage(
        name,
        topic || "Diskusi Umum",
        description || ""
      );

      // Create opening chat message (use admin user as sender)
      await Chat.create({
        UserId: req.user.id,
        message: openingMessage,
        RoomId: room.id,
      });
    } catch (error) {
      console.error("Error generating opening message:", error);
      // If opening message generation fails, create a default message
      await Chat.create({
        UserId: req.user.id,
        message: `Selamat datang di ${name}!${
          topic ? ` Mari kita diskusikan tentang ${topic}.` : ""
        } Silakan bagikan pengalaman dan pendapat Anda.`,
        RoomId: room.id,
      });
    }

    const roomWithCreator = await Room.findByPk(room.id, {
      include: [
        {
          model: User,
          as: "creator",
          attributes: ["id", "name", "photoUrl"],
        },
      ],
    });

    res.status(201).json({ room: roomWithCreator });
  } catch (error) {
    next(error);
  }
};

exports.updateRoom = async (req, res, next) => {
  try {
    // Only admin can update rooms
    if (req.user.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Forbidden: Admin access required" });
    }

    const { id } = req.params;
    const { name, description, topic, isActive } = req.body;

    const room = await Room.findByPk(id);
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    if (name) room.name = name;
    if (description !== undefined) room.description = description;
    if (topic !== undefined) room.topic = topic;
    if (isActive !== undefined) room.isActive = isActive;

    await room.save();

    const roomWithCreator = await Room.findByPk(room.id, {
      include: [
        {
          model: User,
          as: "creator",
          attributes: ["id", "name", "photoUrl"],
        },
      ],
    });

    res.json({ room: roomWithCreator });
  } catch (error) {
    next(error);
  }
};

exports.deleteRoom = async (req, res, next) => {
  try {
    // Only admin can delete rooms
    if (req.user.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Forbidden: Admin access required" });
    }

    const { id } = req.params;

    const room = await Room.findByPk(id);
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    // Soft delete by setting isActive to false
    room.isActive = false;
    await room.save();

    res.json({ message: "Room deactivated successfully" });
  } catch (error) {
    next(error);
  }
};
