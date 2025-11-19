const { Room, User } = require("../models");

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
