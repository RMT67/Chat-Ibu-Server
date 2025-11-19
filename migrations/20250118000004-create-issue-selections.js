'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('IssueSelections', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      UserId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      IssueId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Issues',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      selectedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // Add unique constraint: one user can only select one issue once
    await queryInterface.addIndex('IssueSelections', ['UserId', 'IssueId'], {
      unique: true,
      name: 'unique_user_issue_selection'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('IssueSelections');
  }
};

