const { Chat, User, Room } = require('../models');

exports.getChats = async (req, res, next) => {
  try {
    const { limit = 50, offset = 0, roomId } = req.query;
    
    const where = {};
    if (roomId) where.RoomId = roomId;
    
    const { count, rows } = await Chat.findAndCountAll({
      where,
      include: [
        { model: User, attributes: ['id', 'name', 'photoUrl'] },
        { model: Room, attributes: ['id', 'name'], required: false }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    res.json({
      chats: rows.reverse(), // Reverse untuk chronological order
      total: count,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    next(error);
  }
};

exports.getChatById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const chat = await Chat.findByPk(id, {
      include: [
        { model: User, attributes: ['id', 'name', 'photoUrl'] },
        { model: Room, attributes: ['id', 'name'], required: false }
      ]
    });
    
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }
    
    res.json({ chat });
  } catch (error) {
    next(error);
  }
};