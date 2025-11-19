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
