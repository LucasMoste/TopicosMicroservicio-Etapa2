const express = require('express');
const { badRequest, notFound } = require('../errors');
const productosClient = require('../clients/productosClient');
const promocionesClient = require('../clients/promocionesClient');
const {
  armarPromocionesVigentesPrecios,
  armarDetallePromoProductos,
} = require('../services/calculoPrecios');

const router = express.Router();

function parseFecha(raw) {
  if (!raw) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    throw badRequest('El parámetro fecha debe tener formato YYYY-MM-DD');
  }
  const d = new Date(`${raw}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== raw) {
    throw badRequest('El parámetro fecha no corresponde a una fecha válida');
  }
  return raw;
}

// GET /promociones/vigentes/precios?fecha=YYYY-MM-DD
router.get('/vigentes/precios', async (req, res, next) => {
  try {
    const fecha = parseFecha(req.query.fecha);

    // Consulta en paralelo a ambos microservicios
    const [promociones, productos] = await Promise.all([
      promocionesClient.getPromocionesVigentes(fecha),
      productosClient.getAllProductos(),
    ]);

    const resultado = armarPromocionesVigentesPrecios(promociones, productos);
    res.json(resultado);
  } catch (err) {
    next(err);
  }
});

// GET /promociones/:id/productos
router.get('/:id/productos', async (req, res, next) => {
  try {
    const id = String(req.params.id).trim().toUpperCase();

    // Consulta en paralelo
    const [promo, productos] = await Promise.all([
      promocionesClient.getPromocionById(id),
      productosClient.getAllProductos(),
    ]);

    if (!promo) {
      throw notFound(`No existe la promoción ${req.params.id}`);
    }

    const resultado = armarDetallePromoProductos(promo, productos);
    res.json(resultado);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
