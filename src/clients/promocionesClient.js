const { UpstreamError } = require('../errors');

const SERVICE_NAME = 'MS-promociones';
const DEFAULT_PROMOS_URL = 'https://topicosmicroservicio.onrender.com';
const TIMEOUT_MS = 10000; // Más tolerante para arranques en frío de Render

function getBaseUrl() {
  const url = process.env.PROMOS_URL || DEFAULT_PROMOS_URL;
  return url.replace(/\/+$/, '');
}

async function fetchFromPromociones(endpoint) {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}${endpoint}`;

  let res;
  try {
    res = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { accept: 'application/json' },
    });
  } catch (err) {
    throw new UpstreamError({
      service: SERVICE_NAME,
      url,
      detail: err.name === 'TimeoutError' ? `Timeout tras ${TIMEOUT_MS}ms` : err.message,
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
 * Obtiene las promociones vigentes para una fecha dada.
 */
async function getPromocionesVigentes(fecha) {
  const query = new URLSearchParams({ vigente: 'true', limit: '100' });
  if (fecha) query.set('fecha', fecha);

  const data = await fetchFromPromociones(`/items?${query.toString()}`);
  if (!data || !Array.isArray(data.items)) {
    throw new UpstreamError({
      service: SERVICE_NAME,
      url: `${getBaseUrl()}/items`,
      detail: 'Estructura inválida en respuesta de promociones',
    });
  }
  return data.items;
}

/**
 * Obtiene una promoción por su identificador único (ej: PRM001).
 * Retorna null si no existe (404).
 */
async function getPromocionById(id) {
  return await fetchFromPromociones(`/items/${encodeURIComponent(id)}`);
}

module.exports = {
  getPromocionesVigentes,
  getPromocionById,
  getBaseUrl,
};
