const db = require('../models');
const { Op } = require('sequelize');

const createGame = async (gameData) => {
  try {
    return await db.Game.create(gameData);
  } catch (error) {
    throw new Error(`Error creating game: ${error.message}`);
  }
};

const bulkCreateGames = async (gamesData) => {
  try {
    return await db.Game.bulkCreate(gamesData);
  } catch (error) {
    throw new Error(`Error bulk creating games: ${error.message}`);
  }
};

const getAllGames = async () => {
  try {
    return await db.Game.findAll();
  } catch (error) {
    throw new Error(`Error fetching games: ${error.message}`);
  }
};

const searchGames = async (name, platform) => {
  try {
    const whereClause = {
      name: { [Op.like]: `%${name}%` },
      ...(platform ? { platform } : {}),
    };
    return await db.Game.findAll({ where: whereClause });
  } catch (error) {
    throw new Error(`Error searching games: ${error.message}`);
  }
};

const updateGame = async (id, gameData) => {
  try {
    const game = await db.Game.findByPk(id);
    if (!game) throw new Error('Game not found');
    await game.update(gameData);
    return game;
  } catch (error) {
    throw new Error(`Error updating game: ${error.message}`);
  }
};

const deleteGame = async (id) => {
  try {
    const game = await db.Game.findByPk(id);
    if (!game) throw new Error('Game not found');
    await game.destroy();
    return { message: 'Game deleted successfully' };
  } catch (error) {
    throw new Error(`Error deleting game: ${error.message}`);
  }
};

module.exports = {
  createGame,
  bulkCreateGames,
  getAllGames,
  searchGames,
  updateGame,
  deleteGame,
};
