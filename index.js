const express = require('express');
const bodyParser = require('body-parser');
const db = require('./models');
const { Op } = require('sequelize');
const axios = require('axios');
const { Transform } = require('stream');
const JSONStream = require('JSONStream'); // Permet de parser du JSON en streaming

const app = express();

app.use(bodyParser.json());
app.use(express.static(`${__dirname}/static`));

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

    let batch = [];

    await Promise.all(
      urls.map(async ({ url, platform }) => new Promise((resolve, reject) => {
        axios({ method: 'get', url, responseType: 'stream' }).then(
          (response) => {
            response.data
              .pipe(JSONStream.parse('*')) // Parse chaque élément JSON un par un
              .pipe(new Transform({
                objectMode: true,
                async transform(game, _, callback) {
                  const bulk = game.reduce((acc, value) => {
                    // check if all values are present
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
                        isPublished: true, // default to true
                      });
                    }
                    return acc;
                  }, []);

                  batch.push(...bulk);

                  if (batch.length >= 100) {
                    await db.Game.bulkCreate(batch)
                      .then(() => {
                        batch = []; // Reset batch after insertion
                      })
                  }

                  callback();
                },
              }))
              .on('finish', async () => {
                await db.Game.bulkCreate(batch)
                  .then(() => {
                    batch = [];
                  });
                  resolve();
              })
              .on('error', reject);
          },
        ).catch(reject);
      })),
    );

    return res.status(200).send({ message: 'Database populated successfully!' });
  } catch (error) {
    console.error('Error populating database:', error);
    return res.status(500).send({ error: 'Failed to populate database' });
  }
});


app.post('/api/games/search', (req, res) => {
  const { name, platform } = req.body;
  return db.Game.findAll({ where: { name: { [Op.like]: `%${name}%` }, ...(platform ? { platform } : {}) } })
    .then((games) => res.send(games))
    .catch((err) => {
      console.log('There was an error querying games', JSON.stringify(err));
      return res.send(err);
    });
});

app.get('/api/games', (req, res) => db.Game.findAll()
  .then((games) => res.send(games))
  .catch((err) => {
    console.log('There was an error querying games', JSON.stringify(err));
    return res.send(err);
  }));

app.post('/api/games', (req, res) => {
  const { publisherId, name, platform, storeId, bundleId, appVersion, isPublished } = req.body;
  return db.Game.create({ publisherId, name, platform, storeId, bundleId, appVersion, isPublished })
    .then((game) => res.send(game))
    .catch((err) => {
      console.log('***There was an error creating a game', JSON.stringify(err));
      return res.status(400).send(err);
    });
});

app.delete('/api/games/:id', (req, res) => {
  // eslint-disable-next-line radix
  const id = parseInt(req.params.id);
  return db.Game.findByPk(id)
    .then((game) => game.destroy({ force: true }))
    .then(() => res.send({ id }))
    .catch((err) => {
      console.log('***Error deleting game', JSON.stringify(err));
      res.status(400).send(err);
    });
});

app.put('/api/games/:id', (req, res) => {
  // eslint-disable-next-line radix
  const id = parseInt(req.params.id);
  return db.Game.findByPk(id)
    .then((game) => {
      const { publisherId, name, platform, storeId, bundleId, appVersion, isPublished } = req.body;
      return game.update({ publisherId, name, platform, storeId, bundleId, appVersion, isPublished })
        .then(() => res.send(game))
        .catch((err) => {
          console.log('***Error updating game', JSON.stringify(err));
          res.status(400).send(err);
        });
    });
});

app.listen(3000, () => {
  console.log('Server is up on port 3000');
});

module.exports = app;
