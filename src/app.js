const express = require('express');
const cors = require('cors');

const healthRouter = require('./routes/health');
const promocionesPreciosRouter = require('./routes/promocionesPrecios');
const { HttpError } = require('./errors');

const app = express();

app.use(cors());
app.disable('x-powered-by');

app.get('/', (req, res) => {
  res.json({
    service: process.env.SERVICE_NAME || 'promociones-precios',
    descripcion: 'Servicio derivado que consume MS-productos y MS-promociones (Etapa 2)',
    endpoints: [
      'GET /health',
      'GET /promociones/vigentes/precios?fecha=YYYY-MM-DD',
      'GET /promociones/:id/productos',
    ],
    upstream: {
      Z_URL: process.env.Z_URL || 'no_configurada',
      PROMOS_URL: process.env.PROMOS_URL || 'no_configurada',
    },
  });
});

app.use('/health', healthRouter);
app.use('/promociones', promocionesPreciosRouter);

// Manejador de rutas no encontradas (404)
app.use((req, res) => {
  res.status(404).json({
    error: 'not_found',
    message: `Ruta ${req.method} ${req.path} no encontrada.`,
  });
});

// Middleware centralizado de errores
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof HttpError) {
    return res.status(err.status).json({
      error: err.code,
      message: err.message,
      ...(err.extra || {}),
    });
  }

  console.error('Error no controlado:', err);
  res.status(500).json({
    error: 'internal_error',
    message: 'Error interno del servidor.',
  });
});

module.exports = app;
