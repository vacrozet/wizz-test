const express = require('express');
const bodyParser = require('body-parser');
const db = require('./models');
const { Op } = require('sequelize');
const axios = require('axios');
const { Transform } = require('stream');
const JSONStream = require('JSONStream'); // Permet de parser du JSON en streaming
const gameService = require('./services/gameService');
const app = express();

app.use(bodyParser.json());
app.use(express.static(`${__dirname}/static`));

const streamAndStoreGames = async (url, platform) => {
  const batch = [];

  const response = await axios({ method: 'get', url, responseType: 'stream' });
  
  return new Promise((resolve, reject) => {
    response.data
      .pipe(JSONStream.parse('*'))
      .pipe(new Transform({
        objectMode: true,
        async transform(game, _, callback) {
          try {
            const bulk = game.reduce((acc, value) => {
              if (
                value &&
                value.name &&
                value.publisher_id &&
                value.app_id &&
                value.bundle_id &&
                value.version
              ) {
                acc.push({
                  publisherId: value.publisher_id,
                  name: value.name,
                  platform,
                  storeId: value.app_id,
                  bundleId: value.bundle_id,
                  appVersion: value.version,
                  isPublished: true,
                });
              }
              return acc;
            }, []);

            batch.push(...bulk);
            if (batch.length >= 100) {
              try {
                await db.Game.bulkCreate(batch);
                batch.length = 0;
              } catch (insertError) {
                console.log({insertError})
                callback(new Error(`Failed to insert data into DB: ${insertError.message}`));
                return;
              }
            }
            callback();
          } catch (err) {
            callback(err);
          }
        },
      }))
      .on('finish', async () => {
        try {
          if (batch.length > 0) {
            await db.Game.bulkCreate(batch);
          }
          resolve();
        } catch (err) {
          console.log({err})
          reject(err);
        }
      })
      .on('error', reject);
  });
}


app.post('/api/games/populate', async (_req, res) => {
  try {
    const urls = [
      {
        url: 'https://interview-marketing-eng-dev.s3.eu-west-1.amazonaws.com/ios.top100.json',
        platform: 'ios',
      },
      {
        url: 'https://interview-marketing-eng-dev.s3.eu-west-1.amazonaws.com/android.top100.json',
        platform: 'android',
      },
    ];

    await Promise.all(
      urls.map(async ({ url, platform }) => {
        await streamAndStoreGames(url, platform);
      })
    );

    res.status(201).send({ message: 'Database populated successfully!' });
  } catch (error) {
    console.log('Error populating database:', error);
    res.status(500).send({ error: error.message });
  }
});


app.post('/api/games/search', async (req, res) => {
  try {
    const { name, platform } = req.body;
    const games = await gameService.searchGames(name, platform);
    res.status(200).json(games);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/games', async (req, res) => {
  try {
    const games = await gameService.getAllGames();
    res.status(200).json(games);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
})

app.post('/api/games', async (req, res) => {
  try {
    const { publisherId, name, platform, storeId, bundleId, appVersion, isPublished } = req.body;
    const game = await gameService.createGame({ publisherId, name, platform, storeId, bundleId, appVersion, isPublished });
    res.status(200).json(game);
  } catch (error) {
    res.status(500).json({ error: error.message });    
  }
});

app.delete('/api/games/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await gameService.deleteGame(id);
    res.status(200).json({ message: 'Game deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/games/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const game = await gameService.updateGame(id, req.body);
    res.status(200).json(game);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => {
  console.log('Server is up on port 3000');
});

module.exports = app;
