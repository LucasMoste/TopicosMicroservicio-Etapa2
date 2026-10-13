function round(num) {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

function calcularDescuento(precioOriginal, porcentajeDescuento) {
  const precio = Number(precioOriginal) || 0;
  const pct = Number(porcentajeDescuento) || 0;
  const precioConDescuento = round(precio * (1 - pct / 100));
  const ahorros = round(precio - precioConDescuento);
  return { precioConDescuento, ahorros };
}

/**
 * Encuentra todos los productos asociados a una promoción.
 * Si la promo es por productoId -> sólo ese producto.
 * Si la promo es por categoriaId -> todos los productos de esa categoría.
 */
function findProductosParaPromo(promo, todosLosProductos) {
  if (promo.productoId) {
    const p = todosLosProductos.find((item) => item.id === promo.productoId);
    return p ? [p] : [];
  }

  if (promo.categoriaId) {
    const cat = String(promo.categoriaId).toUpperCase();
    return todosLosProductos
      .filter((item) => String(item.categoriaId || '').toUpperCase() === cat)
      .sort((a, b) => String(a.id).localeCompare(String(b.id)));
  }

  return [];
}

/**
 * Genera el listado plano para GET /promociones/vigentes/precios
 */
function armarPromocionesVigentesPrecios(promociones, productos) {
  const resultado = [];

  for (const promo of promociones) {
    const asociados = findProductosParaPromo(promo, productos);
    for (const p of asociados) {
      const { precioConDescuento, ahorros } = calcularDescuento(p.precio, promo.descuentoPct);
      resultado.push({
        promocionId: promo.id,
        nombrePromocion: promo.nombre,
        productoId: p.id,
        nombreProducto: p.nombre,
        precioOriginal: Number(p.precio),
        porcentajeDescuento: Number(promo.descuentoPct),
        precioConDescuento,
        ahorros,
        vigencia: `${promo.fechaInicio} al ${promo.fechaFin}`,
      });
    }
  }

  return resultado;
}

/**
 * Genera el detalle para GET /promociones/:id/productos
 */
function armarDetallePromoProductos(promo, productos) {
  const asociados = findProductosParaPromo(promo, productos);
  const productosDetalle = asociados.map((p) => {
    const { precioConDescuento } = calcularDescuento(p.precio, promo.descuentoPct);
    return {
      productoId: p.id,
      nombre: p.nombre,
      precioOriginal: Number(p.precio),
      precioConDescuento,
    };
  });

  return {
    promocionId: promo.id,
    nombrePromocion: promo.nombre,
    fechaInicio: promo.fechaInicio,
    fechaFin: promo.fechaFin,
    porcentajeDescuento: Number(promo.descuentoPct),
    productos: productosDetalle,
  };
}

module.exports = {
  round,
  calcularDescuento,
  findProductosParaPromo,
  armarPromocionesVigentesPrecios,
  armarDetallePromoProductos,
};
