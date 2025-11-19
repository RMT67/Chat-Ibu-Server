const { Chat, User, Room } = require("../models");

exports.getChatById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const chat = await Chat.findByPk(id, {
      include: [
        { model: User, attributes: ["id", "name", "photoUrl"] },
        { model: Room, attributes: ["id", "name"], required: false },
      ],
    });

    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    res.json({ chat });
  } catch (error) {
    next(error);
  }
};
