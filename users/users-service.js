const express = require('express');
const { createProxyMiddleware, fixRequestBody } = require('http-proxy-middleware');
const swaggerUi = require('swagger-ui-express');
const fs = require('node:fs');
const YAML = require('js-yaml');
const promBundle = require('express-prom-bundle');
const crypto = require('node:crypto');
const cookieParser = require('cookie-parser');
const Redis = require('ioredis');

const app = express();
const port = 3000;

// --- Redis client for server-side session storage ---
const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  enableOfflineQueue: false // reject immediately if Redis is down, don't queue
});

redisClient.on('error', (err) => {
  console.error('Redis error:', err.message);
});

const SESSION_TTL_SECONDS = 1800; // 30 minutes

async function createSession(userData) {
  const sessionId = crypto.randomUUID();
  await redisClient.setex(`session:${sessionId}`, SESSION_TTL_SECONDS, JSON.stringify(userData));
  return sessionId;
}

async function getSession(sessionId) {
  if (!sessionId) return null;
  const data = await redisClient.get(`session:${sessionId}`);
  return data ? JSON.parse(data) : null;
}

async function destroySession(sessionId) {
  if (sessionId) await redisClient.del(`session:${sessionId}`);
}

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
    // Credentials (cookies) require a specific origin
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

// Cookie options for the session ID cookie (stores no user data, just an opaque ID)
const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,                                        // JS cannot read this cookie
  secure: process.env.NODE_ENV === 'production',         // HTTPS only in production
  sameSite: 'lax',
  path: '/',
  maxAge: SESSION_TTL_SECONDS * 1000                     // 30 minutes in milliseconds
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

// SESSION READ — looks up the session in Redis by the cookie session ID
app.get('/api/me', async (req, res) => {
  const sessionId = req.cookies.sessionId;
  if (!sessionId) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const user = await getSession(sessionId);
    if (!user) return res.status(401).json({ error: 'Session expired or invalid' });
    res.json(user);
  } catch {
    res.status(500).json({ error: 'Session store unavailable' });
  }
});

// LOGOUT — deletes the session from Redis and clears the cookie
app.post('/api/logout', verifyCsrf, async (req, res) => {
  const sessionId = req.cookies.sessionId;
  await destroySession(sessionId);
  res.clearCookie('sessionId', { path: '/', httpOnly: true, sameSite: 'lax' });
  res.json({ message: 'Logged out' });
});

// LOGIN — calls auth service, creates server-side session in Redis on success
app.post('/api/login', verifyCsrf, async (req, res) => {
  const { email } = req.body;

  let response, data;
  try {
    response = await fetch(`${AUTH_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    data = await response.json();
  } catch (err) {
    console.error(`[LOGIN] Auth service unreachable for ${email}: ${err.message}`);
    return res.status(500).json({ error: 'Unable to reach the authentication service. Please try again later.' });
  }

  if (response.ok) {
    try {
      const sessionId = await createSession({ username: data.username, email: data.email });
      res.cookie('sessionId', sessionId, SESSION_COOKIE_OPTIONS);
      console.log(`[LOGIN] Success: ${email}`);
    } catch (err) {
      console.error(`[LOGIN] Session creation failed for ${email}: ${err.message}`);
      return res.status(500).json({ error: 'Login succeeded but session could not be created. Please try again.' });
    }
  } else {
    console.warn(`[LOGIN] Failed for ${email} — HTTP ${response.status}: ${data.error}`);
    data.error = response.status === 401
      ? 'Invalid email or password.'
      : 'Login failed. Please try again.';
  }
  res.status(response.status).json(data);
});

// REGISTER — calls auth service, creates server-side session in Redis on success
app.post('/api/register', verifyCsrf, async (req, res) => {
  const { email } = req.body;

  let response, data;
  try {
    response = await fetch(`${AUTH_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    data = await response.json();
  } catch (err) {
    console.error(`[REGISTER] Auth service unreachable for ${email}: ${err.message}`);
    return res.status(500).json({ error: 'Unable to reach the authentication service. Please try again later.' });
  }

  if (response.ok) {
    try {
      const sessionId = await createSession({ username: data.username, email: data.email });
      res.cookie('sessionId', sessionId, SESSION_COOKIE_OPTIONS);
      console.log(`[REGISTER] Success: ${email}`);
    } catch (err) {
      console.error(`[REGISTER] Session creation failed for ${email}: ${err.message}`);
      return res.status(500).json({ error: 'Registration succeeded but session could not be created. Please try again.' });
    }
  } else {
    console.warn(`[REGISTER] Failed for ${email} — HTTP ${response.status}: ${data.error}`);
    data.error = data.error?.toLowerCase().includes('already exists')
      ? 'An account with this email already exists.'
      : 'Registration failed. Please try again.';
  }
  res.status(response.status).json(data);
});

// UPDATE USERNAME — updates the session data in Redis with the new username
app.post('/api/update-username', verifyCsrf, async (req, res) => {
  const sessionId = req.cookies.sessionId;
  if (!sessionId) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const user = await getSession(sessionId);
    if (!user) return res.status(401).json({ error: 'Session expired or invalid' });
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'Username is required' });
    await redisClient.setex(`session:${sessionId}`, SESSION_TTL_SECONDS, JSON.stringify({ ...user, username }));
    res.json({ username });
  } catch {
    res.status(500).json({ error: 'Session store unavailable' });
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
