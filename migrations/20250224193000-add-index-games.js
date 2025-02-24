'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addIndex('Games', ['name'], {
      name: 'idx_name',
      unique: false,
    });
    await queryInterface.addIndex('Games', ['platform'], {
      name: 'idx_platform',
      unique: false,
    });
    await queryInterface.addIndex('Games', ['name', 'platform'], {
      name: 'idx_name_platform',
      unique: false,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('Games', 'idx_name');
    await queryInterface.removeIndex('Games', 'idx_platform');
    await queryInterface.removeIndex('Games', 'idx_name_platform');
  }
};