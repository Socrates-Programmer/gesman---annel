import { requestJson } from "./apiClient";

const DEFAULT_PAGE_SIZE = 20;

export async function fetchIncidents({
  page = 1,
  limit = DEFAULT_PAGE_SIZE,
  q = "",
  statusId = "",
  includeClosed = false,
} = {}) {
  const query = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (q && q.trim()) {
    query.set("q", q.trim());
  }

  if (statusId) {
    query.set("estado_id", String(statusId));
  }

  if (includeClosed) {
    query.set("includeClosed", "true");
  }

  const payload = await requestJson(`/api/incidents?${query.toString()}`);
  return {
    rows: payload && Array.isArray(payload.data) ? payload.data : [],
    meta: payload && payload.meta ? payload.meta : { total: 0, page, pageSize: limit, totalPages: 1 },
  };
}

export async function fetchIncidentById(incidentId) {
  const payload = await requestJson(`/api/incidents/${incidentId}`);
  return payload && payload.data ? payload.data : null;
}

export async function createIncident(payload) {
  const response = await requestJson("/api/incidents", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return response && response.data ? response.data : null;
}

export async function updateIncident(incidentId, payload) {
  const response = await requestJson(`/api/incidents/${incidentId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

  return response && response.data ? response.data : null;
}

export async function deleteIncident(incidentId) {
  await requestJson(`/api/incidents/${incidentId}`, {
    method: "DELETE",
  });
}
