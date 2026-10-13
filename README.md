# promociones-precios (Etapa 2 — Microservicios)

Servicio derivado que consume **MS-promociones** y el servicio **MS-productos** (Z) de otro grupo para producir un dato nuevo: el catálogo de productos con precios originales, descuentos vigentes aplicados, precio con descuento y ahorro calculado.

---

## 📋 Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/health` | Verificación de salud y disponibilidad (< 1 s) |
| `GET` | `/promociones/vigentes/precios?fecha=YYYY-MM-DD` | Productos alcanzados por promociones vigentes con precio original y precio con descuento |
| `GET` | `/promociones/{id}/productos` | Productos asociados a una promoción específica con cálculo de descuento |

---

## ⚙️ Variables de Entorno

| Variable | Descripción | Ejemplo |
|---|---|---|
| `PORT` | Puerto de escucha | `3001` (local) / dinámico en Render |
| `SERVICE_NAME` | Nombre del microservicio | `promociones-precios` |
| `Z_URL` | **URL base del microservicio MS-productos (Z)** | `https://ms-productos-1uz6.onrender.com` |
| `PROMOS_URL` | URL base del microservicio MS-promociones (Etapa 1) | `https://topicosmicroservicio.onrender.com` |
| `UPSTREAM_TIMEOUT_MS` | Timeout máximo hacia upstream (5 s según contrato) | `5000` |

---

## 🛡️ Tolerancia a Fallos (Upstream 502)

Si el servicio `MS-productos` (`Z_URL`) se encuentra fuera de línea o tarda más de 5 segundos en responder, el servicio responde inmediatamente con código **502 Bad Gateway** y el formato estandarizado:

```json
{
  "error": "upstream_unavailable",
  "message": "No se pudo conectar a MS-productos. Por favor reintenta en unos segundos.",
  "upstream": {
    "service": "MS-productos",
    "url": "https://ms-productos-1uz6.onrender.com/items?limit=100",
    "status": 500
  }
}
```

---

## 🧪 Pruebas Automatizadas

El proyecto incluye dos suites de pruebas según la consigna:

```bash
# 1. Pruebas con Z simulado (Mock con datos de kit/seed y tolerancia 502):
npm run test:mock

# 2. Pruebas contra los servicios reales en producción:
npm run test:real

# 3. Ambas suites completas:
npm test
```

---

## 🚀 Ejemplos de Uso (curl)

### 1. Health check
```bash
curl -X GET https://TU-SERVICIO.onrender.com/health
```

Respuesta:
```json
{
  "status": "ok",
  "timestamp": "2026-10-13T20:44:50.123Z",
  "service": "promociones-precios"
}
```

### 2. Promociones vigentes con precios calculados
```bash
curl -X GET "https://TU-SERVICIO.onrender.com/promociones/vigentes/precios?fecha=2026-10-11"
```

Respuesta:
```json
[
  {
    "promocionId": "PRM001",
    "nombrePromocion": "Semana del Celular",
    "productoId": "PRD001",
    "nombreProducto": "Smartphone Nova X1 128GB",
    "precioOriginal": 450000,
    "porcentajeDescuento": 15,
    "precioConDescuento": 382500,
    "ahorros": 67500,
    "vigencia": "2026-10-05 al 2026-10-18"
  }
]
```

### 3. Productos de una promoción específica
```bash
curl -X GET https://TU-SERVICIO.onrender.com/promociones/PRM001/productos
```

Respuesta:
```json
{
  "promocionId": "PRM001",
  "nombrePromocion": "Semana del Celular",
  "fechaInicio": "2026-10-05",
  "fechaFin": "2026-10-18",
  "porcentajeDescuento": 15,
  "productos": [
    {
      "productoId": "PRD001",
      "nombre": "Smartphone Nova X1 128GB",
      "precioOriginal": 450000,
      "precioConDescuento": 382500
    }
  ]
}
```
