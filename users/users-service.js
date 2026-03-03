const express = require('express');
const app = express();
const port = 3000;
const swaggerUi = require('swagger-ui-express');
const fs = require('node:fs');
const YAML = require('js-yaml');
const promBundle = require('express-prom-bundle');

const metricsMiddleware = promBundle({includeMethod: true});
app.use(metricsMiddleware);

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

app.use(express.json());

// RUTA DE REGISTRO
app.post('/api/register', async (req, res) => {
  const { email, username, password } = req.body;
  try {
    // Aquí hacemos puente hacia el microservicio en Rust (asumiendo que corre en el puerto 8000)
    const rustResponse = await fetch('http://127.0.0.1:8000/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, username, password })
    });
    
    if (!rustResponse.ok) {
      const errorText = await rustResponse.text();
      return res.status(400).json({ error: errorText });
    }

    res.json({ message: 'User registered successfully!' });
  } catch (err) {
    console.error('[Error] Fallo en la comunicación al registrar usuario:', err);
    res.status(500).json({ error: 'Internal server error communicating with database service.' });
  }
});

// RUTA DE LOGIN
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const rustResponse = await fetch('http://127.0.0.1:8000/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!rustResponse.ok) {
      const errorText = await rustResponse.text();
      return res.status(401).json({ error: errorText });
    }

    const userData = await rustResponse.json();
    res.json({ message: `Welcome back, ${userData.username}!` });
  } catch (err) {
    console.error('[Error] Fallo en la comunicación al iniciar sesión:', err);
    res.status(500).json({ error: 'Internal server error communicating with database service.' });
  }
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`User Service listening at http://localhost:${port}`)
  })
}

module.exports = app;