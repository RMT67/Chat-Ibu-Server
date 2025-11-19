'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Drop foreign key constraint for IssueId in Chats table
    await queryInterface.removeConstraint('Chats', 'Chats_IssueId_fkey', {
      type: 'foreign key'
    }).catch(() => {
      // Constraint might not exist or have different name
      console.log('Foreign key constraint not found or already removed');
    });

    // Drop IssueId column from Chats table
    await queryInterface.removeColumn('Chats', 'IssueId');

    // Drop IssueSelections table
    await queryInterface.dropTable('IssueSelections');

    // Drop Issues table
    await queryInterface.dropTable('Issues');
  },

  async down(queryInterface, Sequelize) {
    // Recreate Issues table
    await queryInterface.createTable('Issues', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      RoomId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Rooms',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      generatedAt: {
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

    // Recreate IssueSelections table
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

    // Add unique constraint for IssueSelections
    await queryInterface.addIndex('IssueSelections', ['UserId', 'IssueId'], {
      unique: true,
      name: 'IssueSelections_UserId_IssueId_unique'
    });

    // Add IssueId column back to Chats table
    await queryInterface.addColumn('Chats', 'IssueId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'Issues',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
  }
};

