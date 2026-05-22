import { requestJson } from "./apiClient";

export async function fetchIncidentFormCatalogs() {
  const payload = await requestJson("/api/catalogs/incident-form");
  return payload && payload.data
    ? payload.data
    : {
        vehicles: [],
        incidentTypes: [],
        priorities: [],
        incidentStatuses: [],
        incidentCategories: [],
      };
}

async function createCatalogItem(url, payload) {
  const response = await requestJson(url, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return response && response.data ? response.data : null;
}

async function updateCatalogItem(url, payload) {
  const response = await requestJson(url, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return response && response.data ? response.data : null;
}

async function deleteCatalogItem(url) {
  await requestJson(url, { method: "DELETE" });
}

export function createIncidentCategory(payload) {
  return createCatalogItem("/api/catalogs/incident-categories", payload);
}

export function updateIncidentCategory(id, payload) {
  return updateCatalogItem(`/api/catalogs/incident-categories/${id}`, payload);
}

export function deleteIncidentCategory(id) {
  return deleteCatalogItem(`/api/catalogs/incident-categories/${id}`);
}

export function createIncidentType(payload) {
  return createCatalogItem("/api/catalogs/incident-types", payload);
}

export function updateIncidentType(id, payload) {
  return updateCatalogItem(`/api/catalogs/incident-types/${id}`, payload);
}

export function deleteIncidentType(id) {
  return deleteCatalogItem(`/api/catalogs/incident-types/${id}`);
}

export function createPriority(payload) {
  return createCatalogItem("/api/catalogs/priorities", payload);
}

export function updatePriority(id, payload) {
  return updateCatalogItem(`/api/catalogs/priorities/${id}`, payload);
}

export function deletePriority(id) {
  return deleteCatalogItem(`/api/catalogs/priorities/${id}`);
}

export function createIncidentStatus(payload) {
  return createCatalogItem("/api/catalogs/incident-statuses", payload);
}

export function updateIncidentStatus(id, payload) {
  return updateCatalogItem(`/api/catalogs/incident-statuses/${id}`, payload);
}

export function deleteIncidentStatus(id) {
  return deleteCatalogItem(`/api/catalogs/incident-statuses/${id}`);
}
