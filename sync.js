import mysql from 'mysql2/promise';
import { Meilisearch } from 'meilisearch';

const dbConfig = {
  host: 'db',
  user: 'root',
  password: 'root',
  database: 'movies_catalog',
};

const searchClient = new Meilisearch({
  host: 'http://search:7700',
  apiKey: 'masterKey123!',
});

async function run() {
  const connection = await mysql.createConnection(dbConfig);
  console.log(' Connected to MySQL.');

  const index = searchClient.index('movies');
  console.log(' Connected to Meilisearch.');

  console.log(' Configuring search weights...');
  await index.updateSearchableAttributes(['title', 'genres']);
  await index.updateRankingRules([
    'words',
    'typo',
    'proximity',
    'attribute',
    'sort',
    'exactness',
  ]);

  let offset = 0;
  const LIMIT = 10000;
  let totalSynced = 0;

  console.log(' Starting data migration to Meilisearch...');

  while (true) {
    const [rows] = await connection.query(
      'SELECT id, tconst, title, year, genres FROM movies LIMIT ? OFFSET ?',
      [LIMIT, offset]
    );

    if (rows.length === 0) {
      break;
    }

    const documents = rows.map(row => ({
      id: row.id,
      tconst: row.tconst,
      title: row.title,
      year: row.year,
      genres: row.genres ? row.genres.split(',') : []
    }));

    await index.addDocuments(documents);

    totalSynced += rows.length;
    console.log(` Synced: ${totalSynced} movies...`);

    offset += LIMIT;
  }

  console.log(`\n Synchronization completed! ${totalSynced} documents sent to the Meilisearch queue.`);
  await connection.end();
}

run().catch(console.error);