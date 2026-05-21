import fs from 'fs';
import readline from 'readline';
import mysql from 'mysql2/promise';

const dbConfig = {
  host: 'db',
  user: 'root',
  password: 'root',
  database: 'movies_catalog',
};

async function run() {
  const connection = await mysql.createConnection(dbConfig);
  console.log(' Connected to MySQL. Creating table if it does not exist...');

  await connection.execute(`
    CREATE TABLE IF NOT EXISTS movies (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tconst VARCHAR(20) NOT NULL,
        title VARCHAR(500) NOT NULL,
        year INT NULL,
        genres VARCHAR(255) NULL
    );
  `);

  console.log(' Starting to read the TSV file...');

  const fileStream = fs.createReadStream('data/title.basics.tsv');
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  let isFirstLine = true;
  let batch = [];
  const BATCH_SIZE = 5000;
  let totalInserted = 0;

  for await (const line of rl) {
    if (isFirstLine) {
      isFirstLine = false;
      continue;
    }

    const [tconst, titleType, primaryTitle, originalTitle, isAdult, startYear, endYear, runtimeMinutes, genres] = line.split('\t');

    if (titleType === 'movie' || titleType === 'tvSeries') {
      const year = startYear === '\\N' ? null : parseInt(startYear, 10);
      const cleanGenres = genres === '\\N' ? null : genres;

      batch.push([tconst, primaryTitle, year, cleanGenres]);
    }

    if (batch.length >= BATCH_SIZE) {
      await insertBatch(connection, batch);
      totalInserted += batch.length;
      console.log(` Processed and saved rows: ${totalInserted}`);
      batch = [];
    }
  }

  if (batch.length > 0) {
    await insertBatch(connection, batch);
    totalInserted += batch.length;
  }

  console.log(`\n Import finished successfully! Total of ${totalInserted} titles imported.`);
  await connection.end();
}

async function insertBatch(connection, batchData) {
  const sql = 'INSERT INTO movies (tconst, title, year, genres) VALUES ?';
  try {
    await connection.query(sql, [batchData]);
  } catch (error) {
    console.error('Error inserting batch:', error);
  }
}

run().catch(console.error);