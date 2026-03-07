const express = require('express');
const { createProxyMiddleware, fixRequestBody } = require('http-proxy-middleware');
const swaggerUi = require('swagger-ui-express');
const fs = require('node:fs');
const YAML = require('js-yaml');
const promBundle = require('express-prom-bundle');
const crypto = require('node:crypto'); 
const cookieParser = require('cookie-parser'); 

const app = express();
const port = 3000;

// 1. Initialize cookie parser before anything else
app.use(cookieParser());

const metricsMiddleware = promBundle({includeMethod: true});
app.use(metricsMiddleware);

const GAME_MANAGER_URL = process.env.GAMEMANAGER_URL || 'http://localhost:5000';
const AUTH_URL = process.env.AUTH_URL || 'http://localhost:4001';

// 2. CORS Configuration Middleware
// This MUST be the first middleware to ensure all responses (including errors) carry CORS headers
const allowedOrigins = new Set(['http://localhost', 'http://localhost:80', 'http://localhost:5173']);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // If the origin is in our allowed list, we echo it back instead of using '*'
  if (allowedOrigins.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (!origin && process.env.NODE_ENV !== 'production') {
    // Allows server-to-server or Postman requests in dev
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS,PUT,DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  // Handle Preflight: Browsers send OPTIONS before POST/PUT with custom headers
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  next();
});

// Swagger documentation
try {
  const swaggerDocument = YAML.load(fs.readFileSync('./openapi.yaml', 'utf8'));
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
} catch (e) {
  console.log("Swagger UI not loaded:", e.message);
}

// --- 1. CSRF TOKEN GENERATION ---
app.get('/api/csrf-token', (req, res) => {
  const csrfToken = crypto.randomUUID(); 
  
  res.cookie('csrf_token', csrfToken, {
    httpOnly: true, // Prevents JS access to the cookie (Security)
    secure: process.env.NODE_ENV === 'production', 
    sameSite: 'lax', // Needed for cross-site requests in some browsers
    path: '/' 
  });
  
  res.json({ csrfToken });
});

// --- 2. CSRF VERIFICATION MIDDLEWARE ---
const verifyCsrf = (req, res, next) => {
  if (['GET', 'OPTIONS', 'HEAD'].includes(req.method)) return next();

  const cookieToken = req.cookies.csrf_token;
  const headerToken = req.headers['x-csrf-token'];

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    console.warn(`CSRF blocked: Cookie(${!!cookieToken}) vs Header(${!!headerToken})`);
    return res.status(403).json({ error: 'Invalid or missing CSRF token' });
  }

  next(); 
};

// --- 3. PROXY ROUTES ---

// Auth Service Proxy
app.use('/api', verifyCsrf, createProxyMiddleware({
  target: AUTH_URL,
  changeOrigin: true,
  pathRewrite: { '^/api': '' },
  on: {
    proxyReq: fixRequestBody, // Fixes body disappearing after express.json()
  },
}));

// Game Manager Proxy
app.use('/game', createProxyMiddleware({
  target: GAME_MANAGER_URL,
  changeOrigin: true,
  pathRewrite: { '^/game': '' },
  on: {
    proxyReq: fixRequestBody,
  },
}));

// JSON Parser (Only needed for local routes, proxy handles its own bodies)
app.use(express.json());

if (require.main === module) {
  app.listen(port, () => {
    console.log(`User Service (API Gateway) listening at http://localhost:${port}`);
  });
}

module.exports = app;