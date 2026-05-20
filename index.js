import express from 'express';
import mysql from 'mysql2/promise';
import { Meilisearch } from 'meilisearch';

const app = express();
const port = 3000;

const pool = mysql.createPool({
  host: 'db',
  user: 'root',
  password: 'root',
  database: 'catalogo_filmes',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const searchClient = new Meilisearch({
  host: 'http://search:7700',
  apiKey: 'masterKey123!',
});
const movieIndex = searchClient.index('movies');

app.get('/search', async (req, res) => {
  const { q } = req.query;

  if (!q) {
    return res.status(400).json({ error: 'O parâmetro de busca "q" é obrigatório.' });
  }

  console.log(`[Busca Otimizada] Pesquisando no Meilisearch por: "${q}"`);
  
  const startTime = process.hrtime();

  try {
    const searchResponse = await movieIndex.search(q, {
      limit: 20
    });

    const endTime = process.hrtime(startTime);

    const durationInMs = (endTime[0] * 1000 + endTime[1] / 1e6).toFixed(2);

    console.log(`[Busca Otimizada] Concluída em ${durationInMs}ms. Itens encontrados: ${searchResponse.hits.length}`);

    return res.json({
      performance: {
        took_ms: parseFloat(durationInMs),
        records_returned: searchResponse.hits.length,
        total_estimated_results: searchResponse.estimatedTotalHits
      },
      results: searchResponse.hits
    });

  } catch (error) {
    console.error('Erro ao realizar busca no Meilisearch:', error);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
});

app.listen(port, () => {
  console.log(` Server rodando em http://localhost:${port}`);
});