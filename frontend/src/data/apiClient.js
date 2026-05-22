export class ApiError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "ApiError";
    this.status = options.status || 0;
    this.code = options.code || null;
    this.field = options.field || null;
  }
}

export async function requestJson(url, options = {}) {
  const headers = {
    Accept: "application/json",
    ...(options.headers || {}),
  };

  if (options.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "same-origin",
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await response.json() : null;

  if (!response.ok) {
    const error = payload && payload.error ? payload.error : null;
    throw new ApiError(
      (error && error.message) || "No se pudo completar la solicitud.",
      {
        status: response.status,
        code: error && error.code ? error.code : null,
        field: error && error.field ? error.field : null,
      }
    );
  }

  return payload;
}
