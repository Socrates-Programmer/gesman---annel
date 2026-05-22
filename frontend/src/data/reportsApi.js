import { requestJson } from "./apiClient";

export async function fetchReportsOverview() {
  const payload = await requestJson("/api/reports/overview");
  return payload && payload.data
    ? payload.data
    : {
        range: null,
        kpis: { openedThisMonth: 0, closedThisMonth: 0, averageResolutionMinutes: null },
        trend: [],
        incidentsByZone: [],
        incidentsByType: [],
      };
}

export function getCsvExportUrl() {
  return "/api/reports/export.csv";
}

export function getPrintableReportUrl() {
  return "/api/reports/print";
}
