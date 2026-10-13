const express = require('express');

const router = express.Router();

// GET /health según contrato formal de Etapa 2
router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: process.env.SERVICE_NAME || 'promociones-precios',
  });
});

module.exports = router;
