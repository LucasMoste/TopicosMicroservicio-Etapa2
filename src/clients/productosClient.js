const { UpstreamError } = require('../errors');

const SERVICE_NAME = 'MS-productos';
const DEFAULT_TIMEOUT_MS = 5000;

function getBaseUrl() {
  const url = process.env.Z_URL;
  if (!url) {
    throw new UpstreamError({
      service: SERVICE_NAME,
      url: 'NO_CONFIGURADA',
      detail: 'Variable Z_URL no configurada',
    });
  }
  return url.replace(/\/+$/, '');
}

function getTimeoutMs() {
  const t = Number(process.env.UPSTREAM_TIMEOUT_MS);
  return Number.isFinite(t) && t > 0 ? t : DEFAULT_TIMEOUT_MS;
}

async function fetchFromProductos(endpoint) {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}${endpoint}`;
  const timeoutMs = getTimeoutMs();

  let res;
  try {
    res = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { accept: 'application/json' },
    });
  } catch (err) {
    throw new UpstreamError({
      service: SERVICE_NAME,
      url,
      detail: err.name === 'TimeoutError' ? `Timeout tras ${timeoutMs}ms` : err.message,
    });
  }

  if (!res.ok) {
    throw new UpstreamError({
      service: SERVICE_NAME,
      url,
      status: res.status,
      detail: `HTTP ${res.status}`,
    });
  }

  try {
    return await res.json();
  } catch (err) {
    throw new UpstreamError({
      service: SERVICE_NAME,
      url,
      detail: 'Respuesta no es JSON válido',
    });
  }
}

/**
 * Obtiene todos los productos del catálogo de MS-productos (con paginación máxima limit=100).
 */
async function getAllProductos() {
  const data = await fetchFromProductos('/items?limit=100');
  if (!data || !Array.isArray(data.items)) {
    throw new UpstreamError({
      service: SERVICE_NAME,
      url: `${getBaseUrl()}/items`,
      detail: 'Estructura inválida de items',
    });
  }
  return data.items;
}

/**
 * Obtiene un producto individual por ID.
 */
async function getProductoById(id) {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/items/${encodeURIComponent(id)}`;
  const timeoutMs = getTimeoutMs();

  let res;
  try {
    res = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { accept: 'application/json' },
    });
  } catch (err) {
    throw new UpstreamError({
      service: SERVICE_NAME,
      url,
      detail: err.name === 'TimeoutError' ? `Timeout tras ${timeoutMs}ms` : err.message,
    });
  }

  if (res.status === 404) {
    return null;
  }

  if (!res.ok) {
    throw new UpstreamError({
      service: SERVICE_NAME,
      url,
      status: res.status,
    });
  }

  return await res.json();
}

module.exports = {
  getAllProductos,
  getProductoById,
  getBaseUrl,
};
