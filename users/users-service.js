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
const allowedOrigins = new Set(['http://20.250.145.156', 'http://localhost', 'http://localhost:80', 'http://localhost:5173']);

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (allowedOrigins.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    // Credentials (cookies) require a specific origin, never a wildcard
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else if (!origin && process.env.NODE_ENV !== 'production') {
    // Allows server-to-server or Postman requests in dev.
    // No credentials header here: '*' and credentials:true is forbidden by the CORS spec.
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS,PUT,DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token');

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
app.use(express.json());

// --- 6. CSRF VERIFICATION MIDDLEWARE ---
// Defined here so it can be used by the local endpoints below
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

// Cookie options shared across login/register/logout
const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,                                    // JS cannot read this cookie
  secure: process.env.NODE_ENV === 'production',     // HTTPS only in production
  sameSite: 'lax',
  path: '/',
  maxAge: 1800000                                    // 30 minutes in milliseconds
};

// --- 7. LOCAL ENDPOINTS ---

// CSRF TOKEN GENERATION
app.get('/api/csrf-token', (req, res) => {
  const csrfToken = crypto.randomUUID();
  res.cookie('csrf_token', csrfToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/'
  });
  res.json({ csrfToken });
});

// SESSION READ — returns the current user from the httpOnly cookie
app.get('/api/me', (req, res) => {
  const userCookie = req.cookies.user;
  if (!userCookie) return res.status(401).json({ error: 'Not authenticated' });
  try {
    res.json(JSON.parse(userCookie));
  } catch {
    res.status(401).json({ error: 'Invalid session' });
  }
});

// LOGOUT — clears the httpOnly session cookie
app.post('/api/logout', verifyCsrf, (req, res) => {
  res.clearCookie('user', { path: '/', httpOnly: true, sameSite: 'lax' });
  res.json({ message: 'Logged out' });
});

// LOGIN — calls auth service, sets httpOnly cookie on success
app.post('/api/login', verifyCsrf, async (req, res) => {
  try {
    const response = await fetch(`${AUTH_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    if (response.ok) {
      res.cookie('user', JSON.stringify({ username: data.username, email: data.email }), SESSION_COOKIE_OPTIONS);
    }
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Auth service unavailable' });
  }
});

// REGISTER — calls auth service, sets httpOnly cookie on success
app.post('/api/register', verifyCsrf, async (req, res) => {
  try {
    const response = await fetch(`${AUTH_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    if (response.ok) {
      res.cookie('user', JSON.stringify({ username: data.username, email: data.email }), SESSION_COOKIE_OPTIONS);
    }
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Auth service unavailable' });
  }
});

// UPDATE USERNAME — refreshes the session cookie with the new username
app.post('/api/update-username', verifyCsrf, (req, res) => {
  const userCookie = req.cookies.user;
  if (!userCookie) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const user = JSON.parse(userCookie);
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'Username is required' });
    res.cookie('user', JSON.stringify({ ...user, username }), SESSION_COOKIE_OPTIONS);
    res.json({ username });
  } catch {
    res.status(401).json({ error: 'Invalid session' });
  }
});

// CREATE USER (From file 2)
app.post('/createuser', async (req, res) => {
  const username = req.body && req.body.username;
  try {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const message = `Hello ${username}! welcome to the course!`;
    res.json({ message });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --- 8. PROXY ROUTES ---

// Auth Service Proxy (handles any /api routes not matched above)
app.use('/api', verifyCsrf, createProxyMiddleware({
  target: AUTH_URL,
  changeOrigin: true,
  pathRewrite: { '^/api': '' },
  on: {
    proxyReq: fixRequestBody,
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

if (require.main === module) {
  app.listen(port, () => {
    console.log(`User Service (API Gateway) listening at http://localhost:${port}`);
  });
}

module.exports = app;
