import { requestJson } from "./apiClient";

export async function fetchActiveVehicles({
  page = 1,
  limit = 10,
  brand = "",
  regionalId = "",
  districtId = "",
} = {}) {
  const query = new URLSearchParams();
  query.set("page", String(page));
  query.set("limit", String(limit));

  if (brand && String(brand).trim()) {
    query.set("brand", String(brand).trim());
  }
  if (regionalId && String(regionalId).trim()) {
    query.set("regionalId", String(regionalId).trim());
  }
  if (districtId && String(districtId).trim()) {
    query.set("districtId", String(districtId).trim());
  }

  const payload = await requestJson(`/api/vehicles/active?${query.toString()}`);

  return {
    rows: payload && Array.isArray(payload.data) ? payload.data : [],
    meta:
      payload && payload.meta
        ? payload.meta
        : {
            total: 0,
            page: 1,
            pageSize: limit,
            totalPages: 1,
            hasNextPage: false,
            hasPrevPage: false,
            summary: null,
            availabilityByBrand: [],
            availabilityByRegional: [],
            availabilityByDistrict: [],
          },
  };
}

export async function fetchVehicleDetail(vehicleId) {
  const payload = await requestJson(`/api/vehicles/${encodeURIComponent(String(vehicleId || ""))}`);
  return payload && payload.data ? payload.data : null;
}

export async function updateVehicleStatus(vehicleId, statusId) {
  const payload = await requestJson(`/api/vehicles/${encodeURIComponent(String(vehicleId || ""))}/status`, {
    method: "PATCH",
    body: JSON.stringify({
      statusId,
    }),
  });

  return payload && payload.data ? payload.data : null;
}
