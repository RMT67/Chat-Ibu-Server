"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1) Add RoomId column as nullable first to avoid FK issues
    await queryInterface.addColumn("Chats", "RoomId", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "Rooms",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    });

    // 2) Determine an existing Room to use, or create one only if a User exists
    let roomIdToUse = null;

    const [existingRooms] = await queryInterface.sequelize.query(
      'SELECT id FROM "Rooms" LIMIT 1'
    );

    if (existingRooms.length > 0) {
      roomIdToUse = existingRooms[0].id;
    } else {
      const [existingUsers] = await queryInterface.sequelize.query(
        'SELECT id FROM "Users" ORDER BY id ASC LIMIT 1'
      );

      if (existingUsers.length > 0) {
        const creatorId = existingUsers[0].id;
        // Create a default room tied to an actual existing user
        await queryInterface.bulkInsert("Rooms", [
          {
            name: "Main Room",
            description: "Default chat room",
            createdBy: creatorId,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]);

        const [newRooms] = await queryInterface.sequelize.query(
          'SELECT id FROM "Rooms" ORDER BY id DESC LIMIT 1'
        );
        if (newRooms.length > 0) {
          roomIdToUse = newRooms[0].id;
        }
      }
    }

    // 3) If we have a Room ID, backfill Chats and make column NOT NULL
    if (roomIdToUse !== null && roomIdToUse !== undefined) {
      await queryInterface.sequelize.query(
        'UPDATE "Chats" SET "RoomId" = :roomId WHERE "RoomId" IS NULL',
        { replacements: { roomId: roomIdToUse } }
      );

      await queryInterface.changeColumn("Chats", "RoomId", {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Rooms",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      });
    } else {
      // No Users found -> cannot create a default Room. Leave column nullable.
      // This avoids FK/NOT NULL violations during migration on empty databases.
      // Consider seeding a user and room, then tightening this column later.
      // Intentionally no changeColumn here.
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("Chats", "RoomId");
  },
};
