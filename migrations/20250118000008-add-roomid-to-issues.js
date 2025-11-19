'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Get default room ID
    const [rooms] = await queryInterface.sequelize.query(
      "SELECT id FROM \"Rooms\" LIMIT 1"
    );
    
    let defaultRoomId = 1;
    if (rooms.length > 0) {
      defaultRoomId = rooms[0].id;
    }
    
    // Add RoomId column
    await queryInterface.addColumn('Issues', 'RoomId', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: defaultRoomId,
      references: {
        model: 'Rooms',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });
    
    // Remove default after adding
    await queryInterface.changeColumn('Issues', 'RoomId', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'Rooms',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Issues', 'RoomId');
  }
};

