'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      User.hasMany(models.Chat, { foreignKey: 'UserId' });
      User.hasMany(models.Room, { foreignKey: 'createdBy', as: 'CreatedRooms' });
    }
  }
  
  User.init({
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [6, 255]
      }
    },
    photoUrl: {
      type: DataTypes.STRING,
      allowNull: true
    },
    isOnline: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    lastSeen: {
      type: DataTypes.DATE,
      allowNull: true
    },
    role: {
      type: DataTypes.ENUM('admin', 'user'),
      defaultValue: 'user',
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'User',
    tableName: 'Users'
  });
  
  return User;
};

