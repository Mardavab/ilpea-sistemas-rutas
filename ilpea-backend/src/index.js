require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const routes  = require('./routes');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check
app.get('/', (_, res) => res.json({ message: 'Bienvenido a ILPEA API', status: 'online', documentation: '/health' }));
app.get('/health', (_, res) => res.json({ status: 'ok', service: 'ILPEA API', timestamp: new Date() }));

// All API routes under /api
app.use('/api', routes);

// 404 fallback
app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada', code: 'NOT_FOUND', status: 404 }));

// Global error handler
app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor', code: 'SERVER_ERROR', status: 500 });
});

app.listen(PORT, () => {
  console.log(`🚀 ILPEA API corriendo en http://localhost:${PORT}`);
  console.log(`📋 Health: http://localhost:${PORT}/health`);
});
