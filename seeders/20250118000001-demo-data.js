"use strict";

const fs = require("fs");
const path = require("path");
const { hashPassword } = require("../helpers/bcrypt");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Read JSON files
    const usersData = JSON.parse(
      fs.readFileSync(path.join(__dirname, "../db/users.json"), "utf8")
    );
    const chatsData = JSON.parse(
      fs.readFileSync(path.join(__dirname, "../db/chats.json"), "utf8")
    );

    // Idempotent user seeding: skip emails that already exist
    const existingUserRows = await queryInterface.sequelize.query(
      'SELECT email FROM "Users"',
      { type: Sequelize.QueryTypes.SELECT }
    );
    const existingEmails = new Set(
      existingUserRows.map((r) => r.email.toLowerCase())
    );

    const usersToInsert = usersData
      .filter((u) => !existingEmails.has(u.email.toLowerCase()))
      .map((user, index) => ({
        name: user.name,
        email: user.email,
        password: hashPassword(user.password),
        photoUrl: user.photoUrl,
        isOnline: user.isOnline || false,
        lastSeen: user.lastSeen ? new Date(user.lastSeen) : null,
        role: user.role || (index === 0 ? "admin" : "user"),
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

    if (usersToInsert.length > 0) {
      await queryInterface.bulkInsert("Users", usersToInsert);
    }

    // Get inserted users to map IDs (email -> new id)
    const insertedUsers = await queryInterface.sequelize.query(
      'SELECT id, email FROM "Users" ORDER BY id',
      { type: Sequelize.QueryTypes.SELECT }
    );

    // Create user ID mapping (original id from JSON -> new database id)
    const userMap = {};
    // Map by matching email instead of relying on original array order
    const insertedUsersByEmail = {};
    insertedUsers.forEach((u) => {
      insertedUsersByEmail[u.email.toLowerCase()] = u.id;
    });
    usersData.forEach((user) => {
      const mappedId = insertedUsersByEmail[user.email.toLowerCase()];
      if (mappedId) {
        userMap[user.id] = mappedId;
      }
    });

    // Create / get default room robustly (avoid undefined length errors)
    const rooms = await queryInterface.sequelize.query(
      'SELECT id FROM "Rooms" LIMIT 1',
      { type: Sequelize.QueryTypes.SELECT }
    );

    let defaultRoomId = null;
    if (rooms.length === 0) {
      // Only create a room if we have at least one user to satisfy FK
      if (insertedUsers.length > 0) {
        await queryInterface.bulkInsert("Rooms", [
          {
            name: "General",
            description: "Default chat room",
            createdBy: insertedUsers[0].id,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]);
        const newRooms = await queryInterface.sequelize.query(
          'SELECT id FROM "Rooms" ORDER BY id DESC LIMIT 1',
          { type: Sequelize.QueryTypes.SELECT }
        );
        if (newRooms.length > 0) {
          defaultRoomId = newRooms[0].id;
        }
      }
    } else {
      defaultRoomId = rooms[0].id;
    }

    // If still no room ID, skip chat seeding gracefully
    if (!defaultRoomId) {
      console.warn("Seeder: No room available; skipping Chats seeding.");
      return;
    }

    // Seed Chats
    const chatsToInsert = chatsData.map((chat) => ({
      UserId: userMap[chat.UserId] || chat.UserId,
      message: chat.message,
      RoomId: defaultRoomId,
      createdAt: chat.createdAt ? new Date(chat.createdAt) : new Date(),
      updatedAt: chat.createdAt ? new Date(chat.createdAt) : new Date(),
    }));

    await queryInterface.bulkInsert("Chats", chatsToInsert);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("Chats", null, {});
    await queryInterface.bulkDelete("Rooms", null, {});
    await queryInterface.bulkDelete("Users", null, {});
  },
};
