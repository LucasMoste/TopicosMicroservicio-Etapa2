require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, () => {
  console.log(`Servicio derivado promociones-precios escuchando en http://localhost:${PORT}`);
  console.log(`Upstream Z (MS-productos): ${process.env.Z_URL || 'no configurado'}`);
  console.log(`Upstream Promociones:     ${process.env.PROMOS_URL || 'no configurado'}`);
});

const shutdown = () => {
  console.log('Cerrando servidor...');
  server.close(() => {
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
