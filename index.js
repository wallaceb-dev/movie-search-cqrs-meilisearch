import express from 'express';
import mysql from 'mysql2/promise';

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

app.get('/search', async (req, res) => {
  const { q } = req.query;

  if (!q) {
    return res.status(400).json({ error: 'O parâmetro de busca "q" é obrigatório.' });
  }

  console.log(`[Busca] Iniciando pesquisa por: "${q}"`);
  
  const startTime = process.hrtime();

  try {
    const querySql = `
      SELECT tconst, title, year, genres 
      FROM movies 
      WHERE title LIKE ? 
      LIMIT 20
    `;
    
    const [rows] = await pool.query(querySql, [`%${q}%`]);

    const endTime = process.hrtime(startTime);
    
    const durationInMs = (endTime[0] * 1000 + endTime[1] / 1e6).toFixed(2);

    console.log(`[Busca] Concluída em ${durationInMs}ms. Itens encontrados: ${rows.length}`);

    return res.json({
      performance: {
        took_ms: parseFloat(durationInMs),
        records_returned: rows.length
      },
      results: rows
    });

  } catch (error) {
    console.error('Erro ao realizar busca:', error);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
});

app.listen(port, () => {
  console.log(` Server rodando em http://localhost:${port}`);
});