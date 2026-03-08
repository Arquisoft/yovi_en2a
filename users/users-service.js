const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const app = express();
const port = 3000;
const swaggerUi = require('swagger-ui-express');
const fs = require('node:fs');
const YAML = require('js-yaml');
const promBundle = require('express-prom-bundle');

const GAME_MANAGER_URL = process.env.GAMEMANAGER_URL || 'http://localhost:5000';
const GAMEY_URL = process.env.GAMEY_URL || 'http://localhost:4000';

// 1. CORS first — before everything else
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// 2. Metrics after CORS
const metricsMiddleware = promBundle({ includeMethod: true });
app.use(metricsMiddleware);

// 3. Swagger docs
try {
  const swaggerDocument = YAML.load(fs.readFileSync('./openapi.yaml', 'utf8'));
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
} catch (e) {
  console.log(e);
}

// 4. Root route
app.get('/', (req, res) => {
  res.json({
    service: "User Service",
    status: "online",
    version: "1.0.0",
    endpoints: {
      docs: "/api-docs",
      game: "/game",
      createUser: "/createuser"
    }
  });
});

// 5. Proxy helpers — safe body check for any JSON value (object, array, etc.)
const forwardBody = (proxyReq, req) => {
  if (req.body !== undefined && req.body !== null) {
    const bodyData = JSON.stringify(req.body);
    proxyReq.setHeader('Content-Type', 'application/json');
    proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
    proxyReq.write(bodyData);
  }
};

const gameManagerProxy = createProxyMiddleware({
  target: GAME_MANAGER_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/game': '',
  },
  on: {
    proxyReq: forwardBody,
  },
});

const gameYProxy = createProxyMiddleware({
  target: GAMEY_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/gamey': '',
  },
  on: {
    proxyReq: forwardBody,
  },
});

// 6. Routes — express.json() added before each proxy so req.body is parsed
app.use('/game', express.json(), gameManagerProxy);
app.use('/gamey', express.json(), gameYProxy);

// 7. Create user route
app.post('/createuser', express.json(), async (req, res) => {
  const username = req.body && req.body.username;
  try {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const message = `Hello ${username}! welcome to the course!`;
    res.json({ message });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`User Service listening at http://localhost:${port}`);
  });
}

module.exports = app;