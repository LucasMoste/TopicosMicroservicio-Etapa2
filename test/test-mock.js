// Test con Z simulado (Mock con datos de kit/seed) según pide la consigna de Etapa 2
const http = require('http');

// Datos simulados (semilla)
const mockPromociones = [
  {
    id: 'PRM001',
    nombre: 'Semana del Celular',
    descuentoPct: 15,
    categoriaId: 'CAT02',
    productoId: null,
    fechaInicio: '2026-10-05',
    fechaFin: '2026-10-18',
  },
  {
    id: 'PRM003',
    nombre: 'Liquidación de auriculares',
    descuentoPct: 10,
    categoriaId: null,
    productoId: 'PRD005',
    fechaInicio: '2026-10-08',
    fechaFin: '2026-10-15',
  },
  {
    id: 'PRM004',
    nombre: 'Día del Libro',
    descuentoPct: 25,
    categoriaId: 'CAT08',
    productoId: null,
    fechaInicio: '2026-09-01',
    fechaFin: '2026-09-30', // Vencida para 2026-10-11
  },
];

const mockProductos = [
  {
    id: 'PRD001',
    nombre: 'Smartphone Nova X1 128GB',
    categoriaId: 'CAT02',
    precio: 450000,
  },
  {
    id: 'PRD002',
    nombre: 'Smartphone Nova Lite 64GB',
    categoriaId: 'CAT02',
    precio: 280000,
  },
  {
    id: 'PRD005',
    nombre: 'Auriculares In-Ear Wireless',
    categoriaId: 'CAT04',
    precio: 75000,
  },
];

let simularFallaZ = false;

// 1. Mock Server para Z (MS-productos)
const mockZServer = http.createServer((req, res) => {
  if (simularFallaZ) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'internal_error' }));
  }

  if (req.url.startsWith('/items?')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ items: mockProductos, total: mockProductos.length }));
  }

  if (req.url === '/items/PRD005') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(mockProductos[2]));
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'not_found' }));
});

// 2. Mock Server para MS-promociones
const mockPromosServer = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');

  if (url.pathname === '/items') {
    const vigente = url.searchParams.get('vigente') === 'true';
    const fecha = url.searchParams.get('fecha') || '2026-10-11';
    let filtradas = mockPromociones;
    if (vigente) {
      filtradas = filtradas.filter((p) => p.fechaInicio <= fecha && fecha <= p.fechaFin);
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ items: filtradas, total: filtradas.length }));
  }

  const match = url.pathname.match(/^\/items\/([A-Za-z0-9]+)$/);
  if (match) {
    const p = mockPromociones.find((i) => i.id === match[1]);
    if (p) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(p));
    }
    res.writeHead(404, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'not_found' }));
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'not_found' }));
});

async function main() {
  await new Promise((resolve) => mockZServer.listen(0, resolve));
  await new Promise((resolve) => mockPromosServer.listen(0, resolve));

  const zPort = mockZServer.address().port;
  const promosPort = mockPromosServer.address().port;

  process.env.Z_URL = `http://127.0.0.1:${zPort}`;
  process.env.PROMOS_URL = `http://127.0.0.1:${promosPort}`;
  process.env.SERVICE_NAME = 'promociones-precios';
  process.env.UPSTREAM_TIMEOUT_MS = '2000';

  const app = require('../src/app');
  const appServer = http.createServer(app);
  await new Promise((resolve) => appServer.listen(0, resolve));
  const appPort = appServer.address().port;
  const base = `http://127.0.0.1:${appPort}`;

  console.log(`--- Ejecutando Pruebas con Z Simulado (Mock) en ${base} ---\n`);

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

  // Test 1: GET /health
  await test('GET /health responde 200 con status: ok y timestamp', async () => {
    const res = await fetch(`${base}/health`);
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    const b = await res.json();
    if (b.status !== 'ok' || !b.timestamp || b.service !== 'promociones-precios') {
      throw new Error(`Payload inválido: ${JSON.stringify(b)}`);
    }
  });

  // Test 2: GET /promociones/vigentes/precios?fecha=2026-10-11
  await test('GET /promociones/vigentes/precios cruza datos y calcula descuentos correctamente', async () => {
    const res = await fetch(`${base}/promociones/vigentes/precios?fecha=2026-10-11`);
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    const items = await res.json();
    if (!Array.isArray(items)) throw new Error('No es array');
    // Para 2026-10-11: PRM001 (CAT02: PRD001 y PRD002) y PRM003 (PRD005). PRM004 está vencida.
    if (items.length !== 3) throw new Error(`Esperaba 3 items, obtuve ${items.length}`);

    const item1 = items.find((i) => i.productoId === 'PRD001');
    if (!item1) throw new Error('Falta PRD001');
    // PRD001: precio 450000, 15% desc -> precioConDescuento: 382500, ahorros: 67500
    if (item1.precioOriginal !== 450000) throw new Error(`Precio original incorrecto: ${item1.precioOriginal}`);
    if (item1.precioConDescuento !== 382500) throw new Error(`Descuento incorrecto: ${item1.precioConDescuento}`);
    if (item1.ahorros !== 67500) throw new Error(`Ahorros incorrectos: ${item1.ahorros}`);
    if (item1.vigencia !== '2026-10-05 al 2026-10-18') throw new Error(`Vigencia incorrecta: ${item1.vigencia}`);
  });

  // Test 3: GET /promociones/:id/productos (ID válido por categoría)
  await test('GET /promociones/PRM001/productos devuelve productos de la promo con descuento', async () => {
    const res = await fetch(`${base}/promociones/PRM001/productos`);
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (data.promocionId !== 'PRM001' || data.porcentajeDescuento !== 15) {
      throw new Error(`Campos principales erróneos: ${JSON.stringify(data)}`);
    }
    if (!Array.isArray(data.productos) || data.productos.length !== 2) {
      throw new Error(`Esperaba 2 productos en CAT02, recibí ${data.productos?.length}`);
    }
    if (data.productos[0].productoId !== 'PRD001' || data.productos[0].precioConDescuento !== 382500) {
      throw new Error(`Detalle de producto erróneo: ${JSON.stringify(data.productos[0])}`);
    }
  });

  // Test 4: GET /promociones/:id/productos (ID inexistente -> 404)
  await test('GET /promociones/PRM999/productos responde 404 not_found', async () => {
    const res = await fetch(`${base}/promociones/PRM999/productos`);
    if (res.status !== 404) throw new Error(`Esperaba 404, obtuve ${res.status}`);
    const data = await res.json();
    if (data.error !== 'not_found') throw new Error(`Error no es not_found: ${JSON.stringify(data)}`);
  });

  // Test 5: GET /promociones/vigentes/precios con fecha inválida -> 400
  await test('GET /promociones/vigentes/precios?fecha=2026-02-30 responde 400 bad_request', async () => {
    const res = await fetch(`${base}/promociones/vigentes/precios?fecha=2026-02-30`);
    if (res.status !== 400) throw new Error(`Esperaba 400, obtuve ${res.status}`);
    const data = await res.json();
    if (data.error !== 'bad_request') throw new Error(`Error no es bad_request: ${JSON.stringify(data)}`);
  });

  // Test 6: Tolerancia a fallos: Si Z falla, responder 502 upstream_unavailable
  await test('Tolerancia a fallos: Si MS-productos falla, responde 502 upstream_unavailable', async () => {
    simularFallaZ = true;
    const res = await fetch(`${base}/promociones/PRM001/productos`);
    simularFallaZ = false;
    if (res.status !== 502) throw new Error(`Esperaba 502, obtuve ${res.status}`);
    const data = await res.json();
    if (data.error !== 'upstream_unavailable' || !data.upstream) {
      throw new Error(`Estructura 502 inválida: ${JSON.stringify(data)}`);
    }
  });

  // Cierre de servidores
  await new Promise((resolve) => appServer.close(resolve));
  await new Promise((resolve) => mockZServer.close(resolve));
  await new Promise((resolve) => mockPromosServer.close(resolve));

  console.log(`\nResultado Mocks: ${ok} OK, ${fail} FAIL\n`);
  process.exit(fail ? 1 : 0);
}

main().catch((err) => {
  console.error('Error fatal en suite de mocks:', err);
  process.exit(1);
});
