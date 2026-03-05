const express = require('express');
const app = express();
const port = 3000;
const swaggerUi = require('swagger-ui-express');
const fs = require('node:fs');
const YAML = require('js-yaml');
const promBundle = require('express-prom-bundle');


const metricsMiddleware = promBundle({includeMethod: true});
app.use(metricsMiddleware);

const GAME_MANAGER_URL = process.env.GAMEMANAGER_URL || 'http://localhost:5000';

try {
  const swaggerDocument = YAML.load(fs.readFileSync('./openapi.yaml', 'utf8'));
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
} catch (e) {
  console.log(e);
}

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

const gameManagerProxy = createProxyMiddleware({
  target: GAME_MANAGER_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/game': '', // Opcional: elimina /game de la URL al llegar a Rust
  },
  onProxyReq: (proxyReq, req, res) => {
    // Si usas express.json() antes, hay que re-escribir el body para el proxy
    if (req.body) {
      const bodyData = JSON.stringify(req.body);
      proxyReq.setHeader('Content-Type', 'application/json');
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    }
  }
});

app.use('/game', gameManagerProxy);

app.use(express.json());

app.post('/createuser', async (req, res) => {
  const username = req.body && req.body.username;
  try {
    // Simulate a 1 second delay to mimic processing/network latency
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const message = `Hello ${username}! welcome to the course!`;
    res.json({ message });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


if (require.main === module) {
  app.listen(port, () => {
    console.log(`User Service listening at http://localhost:${port}`)
  })
}



module.exports = app
