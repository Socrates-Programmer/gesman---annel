import { requestJson } from "./apiClient";

export async function fetchDashboardSummary() {
  const payload = await requestJson("/api/dashboard/summary");
  return payload && payload.data
    ? payload.data
    : {
        metrics: {
          openIncidents: 0,
          closedIncidents: 0,
          activeVehicles: 0,
          totalVehicles: 0,
        },
        statusDistribution: [],
        typeDistribution: [],
        recentIncidents: [],
      };
}
