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
