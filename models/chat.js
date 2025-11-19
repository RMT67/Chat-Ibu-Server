'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Chat extends Model {
    static associate(models) {
      Chat.belongsTo(models.User, { foreignKey: 'UserId' });
      Chat.belongsTo(models.Room, { foreignKey: 'RoomId' });
    }
  }
  
  Chat.init({
    UserId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    RoomId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Rooms',
        key: 'id'
      }
    }
  }, {
    sequelize,
    modelName: 'Chat',
    tableName: 'Chats'
  });
  
  return Chat;
};

