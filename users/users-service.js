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

// 2. Metrics Middleware
const metricsMiddleware = promBundle({includeMethod: true});
app.use(metricsMiddleware);

const GAME_MANAGER_URL = process.env.GAMEMANAGER_URL || 'http://localhost:5000';
const AUTH_URL = process.env.AUTH_URL || 'http://localhost:4001';

// 3. CORS Configuration Middleware
// This MUST be the first middleware to ensure all responses (including errors) carry CORS headers
const allowedOrigins = new Set(['http://20.250.145.156', 'http://localhost', 'http://localhost:80', 'http://localhost:5173']);

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

// 4. Swagger documentation
try {
  const swaggerDocument = YAML.load(fs.readFileSync('./openapi.yaml', 'utf8'));
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
} catch (e) {
  console.log("Swagger UI not loaded:", e.message);
}

// 5. JSON Parser
// Must be declared BEFORE local POST routes so they can read req.body
app.use(express.json());

// --- 6. LOCAL ENDPOINTS ---

// CSRF TOKEN GENERATION
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

// CREATE USER (From file 2)
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

// --- 7. CSRF VERIFICATION MIDDLEWARE ---
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

// --- 8. PROXY ROUTES ---

// Auth Service Proxy
app.use('/api', verifyCsrf, createProxyMiddleware({
  target: AUTH_URL,
  changeOrigin: true,
  pathRewrite: { '^/api': '' },
  on: {
    // fixRequestBody rebuilds the body stream consumed by express.json()
    proxyReq: fixRequestBody, 
  },
}));

// Game Manager Proxy
app.use('/game', createProxyMiddleware({
  target: GAME_MANAGER_URL,
  changeOrigin: true,
  pathRewrite: { '^/game': '' },
  on: {
    // We use fixRequestBody here instead of manual buffer rewriting
    proxyReq: fixRequestBody,
  },
}));

if (require.main === module) {
  app.listen(port, () => {
    console.log(`User Service (API Gateway) listening at http://localhost:${port}`);
  });
}

module.exports = app;