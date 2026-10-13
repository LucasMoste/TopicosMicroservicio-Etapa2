class HttpError extends Error {
  constructor(status, code, message, extra = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}

class UpstreamError extends HttpError {
  constructor({ service, url, status, detail }) {
    const message = `No se pudo conectar a ${service}. Por favor reintenta en unos segundos.`;
    super(502, 'upstream_unavailable', message, {
      upstream: {
        service,
        url,
        ...(status ? { status } : {}),
      },
    });
    this.detail = detail;
  }
}

const badRequest = (message) => new HttpError(400, 'bad_request', message);
const notFound = (message) => new HttpError(404, 'not_found', message);

module.exports = { HttpError, UpstreamError, badRequest, notFound };
