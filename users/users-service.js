const express = require('express');
const { createProxyMiddleware, fixRequestBody } = require('http-proxy-middleware');
const app = express();
const port = 3000;
const swaggerUi = require('swagger-ui-express');
const fs = require('node:fs');
const YAML = require('js-yaml');
const promBundle = require('express-prom-bundle');

const metricsMiddleware = promBundle({includeMethod: true});
app.use(metricsMiddleware);

const GAME_MANAGER_URL = process.env.GAMEMANAGER_URL || 'http://localhost:5000';
const AUTH_URL = process.env.AUTH_URL || 'http://localhost:4001';

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

app.use('/api', createProxyMiddleware({
  target: AUTH_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/api': '',
  },
  on: {
    proxyReq: fixRequestBody,
  },
}));

app.use('/game', createProxyMiddleware({
  target: GAME_MANAGER_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/game': '',
  },
  on: {
    proxyReq: fixRequestBody,
  },
}));

app.use(express.json());
if (require.main === module) {
  app.listen(port, () => {
    console.log(`User Service listening at http://localhost:${port}`)
  })
}

module.exports = app;