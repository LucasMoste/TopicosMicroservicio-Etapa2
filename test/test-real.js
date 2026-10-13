// Test contra servicios reales en Render según pide la consigna de Etapa 2
require('dotenv').config();
const http = require('http');

const Z_URL = process.env.Z_URL || 'https://ms-productos-1uz6.onrender.com';
const PROMOS_URL = process.env.PROMOS_URL || 'https://topicosmicroservicio.onrender.com';

async function main() {
  console.log(`--- Ejecutando Pruebas con Upstreams Reales ---`);
  console.log(`Z_URL (MS-productos):     ${Z_URL}`);
  console.log(`PROMOS_URL (Promociones): ${PROMOS_URL}\n`);

  process.env.Z_URL = Z_URL;
  process.env.PROMOS_URL = PROMOS_URL;
  process.env.SERVICE_NAME = 'promociones-precios';

  const app = require('../src/app');
  const appServer = http.createServer(app);
  await new Promise((resolve) => appServer.listen(0, resolve));
  const appPort = appServer.address().port;
  const base = `http://127.0.0.1:${appPort}`;

  let ok = 0;
  let fail = 0;

  async function test(name, fn) {
    try {
      await fn();
      ok++;
      console.log(`  OK   ${name}`);
    } catch (err) {
      fail++;
      console.log(`  FAIL ${name} -> ${err.message}`);
    }
  }

  // 1. Health
  await test('GET /health responde ok', async () => {
    const res = await fetch(`${base}/health`);
    if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
    const b = await res.json();
    if (b.status !== 'ok' || b.service !== 'promociones-precios') throw new Error(JSON.stringify(b));
  });

  // 2. Precios vigentes con fecha
  await test('GET /promociones/vigentes/precios?fecha=2026-10-11', async () => {
    const res = await fetch(`${base}/promociones/vigentes/precios?fecha=2026-10-11`);
    if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
    const items = await res.json();
    if (!Array.isArray(items) || items.length === 0) throw new Error('Array vacío o inválido');
    const primero = items[0];
    if (!primero.promocionId || !primero.productoId || primero.precioConDescuento === undefined) {
      throw new Error(`Campos faltantes en: ${JSON.stringify(primero)}`);
    }
    console.log(`       -> Se calcularon ${items.length} productos con promociones vigentes.`);
    console.log(`       -> Ejemplo: ${primero.nombrePromocion} en ${primero.nombreProducto}: $${primero.precioOriginal} -> $${primero.precioConDescuento} (-${primero.porcentajeDescuento}%)`);
  });

  // 3. Productos asociados a una promoción específica
  await test('GET /promociones/PRM001/productos', async () => {
    const res = await fetch(`${base}/promociones/PRM001/productos`);
    if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.promocionId !== 'PRM001' || !Array.isArray(data.productos)) {
      throw new Error(`Datos erróneos: ${JSON.stringify(data)}`);
    }
    console.log(`       -> PRM001 (${data.nombrePromocion}) aplica a ${data.productos.length} productos.`);
  });

  // 4. Promoción inexistente -> 404
  await test('GET /promociones/PRM999/productos responde 404', async () => {
    const res = await fetch(`${base}/promociones/PRM999/productos`);
    if (res.status !== 404) throw new Error(`Esperaba 404, obtuve ${res.status}`);
    const b = await res.json();
    if (b.error !== 'not_found') throw new Error(`Error no es not_found: ${JSON.stringify(b)}`);
  });

  await new Promise((resolve) => appServer.close(resolve));

  console.log(`\nResultado Reales: ${ok} OK, ${fail} FAIL\n`);
  process.exit(fail ? 1 : 0);
}

main().catch((err) => {
  console.error('Error fatal en suite real:', err);
  process.exit(1);
});
