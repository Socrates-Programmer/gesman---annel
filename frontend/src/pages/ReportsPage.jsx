import { useEffect, useMemo, useState } from "react";
import { fetchReportsOverview, getCsvExportUrl, getPrintableReportUrl } from "../data/reportsApi";

const PAGE_SIZE = 5;

const EMPTY_OVERVIEW = {
  range: null,
  kpis: {
    openedThisMonth: 0,
    closedThisMonth: 0,
    averageResolutionMinutes: null,
  },
  trend: [],
  incidentsByZone: [],
  incidentsByType: [],
};

const REPORT_STATUS_CONFIG = {
  COMPLETADO: {
    label: "Completado",
    className: "tone-completed",
  },
  EN_REVISION: {
    label: "En revision",
    className: "tone-review",
  },
  PENDIENTE: {
    label: "Pendiente",
    className: "tone-pending",
  },
};

const REPORT_ROWS = buildReportSeed();

const COST_BY_CATEGORY = [
  { label: "Mantenimiento", amount: 620000, className: "tone-blue" },
  { label: "Incidencias", amount: 280000, className: "tone-soft-blue" },
  { label: "Repuestos", amount: 180000, className: "tone-green" },
  { label: "Taller externo", amount: 120000, className: "tone-orange" },
];

const MONTHLY_TREND = [
  { month: "Ene", amount: 720000 },
  { month: "Feb", amount: 810000 },
  { month: "Mar", amount: 950000 },
  { month: "Abr", amount: 1050000 },
  { month: "May", amount: 1250000 },
  { month: "Jun", amount: 1200000 },
];

const DISTRIBUTION = [
  { label: "Operativos", value: 12, colorClass: "dot-blue" },
  { label: "En mantenimiento", value: 7, colorClass: "dot-gold" },
  { label: "Fuera de servicio", value: 5, colorClass: "dot-red" },
  { label: "Incidencias", value: 4, colorClass: "dot-green" },
];

export default function ReportsPage() {
  const [overview, setOverview] = useState(EMPTY_OVERVIEW);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [regionalFilter, setRegionalFilter] = useState("");
  const [reportTypeFilter, setReportTypeFilter] = useState("");
  const [periodFilter, setPeriodFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [page, setPage] = useState(1);
  const [selectedReportId, setSelectedReportId] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadOverview() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const payload = await fetchReportsOverview();
        if (isMounted) {
          setOverview(payload || EMPTY_OVERVIEW);
        }
      } catch (error) {
        if (isMounted) {
          setOverview(EMPTY_OVERVIEW);
          setErrorMessage(error && error.message ? error.message : "No se pudo cargar el resumen del reporte.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadOverview();

    return () => {
      isMounted = false;
    };
  }, []);

  const decoratedReports = useMemo(
    () => REPORT_ROWS.map((row) => mapReportPresentation(row)),
    []
  );

  const filteredReports = useMemo(() => {
    return decoratedReports.filter((row) => {
      if (regionalFilter && row.regional !== regionalFilter) {
        return false;
      }
      if (reportTypeFilter && row.type !== reportTypeFilter) {
        return false;
      }
      if (periodFilter && row.period !== periodFilter) {
        return false;
      }
      if (statusFilter && row.statusCode !== statusFilter) {
        return false;
      }

      if (!searchTerm.trim()) {
        return true;
      }

      const query = searchTerm.trim().toLowerCase();
      return [row.code, row.type, row.busCode, row.generatedBy, row.period]
        .map((value) => String(value || "").toLowerCase())
        .some((value) => value.includes(query));
    });
  }, [decoratedReports, regionalFilter, reportTypeFilter, periodFilter, statusFilter, searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [regionalFilter, reportTypeFilter, periodFilter, statusFilter, searchTerm]);

  useEffect(() => {
    if (!filteredReports.length) {
      setSelectedReportId("");
      return;
    }
    const selectedExists = filteredReports.some((row) => String(row.id) === String(selectedReportId));
    if (!selectedExists) {
      setSelectedReportId(String(filteredReports[0].id));
    }
  }, [filteredReports, selectedReportId]);

  const selectedReport = useMemo(
    () => filteredReports.find((row) => String(row.id) === String(selectedReportId)) || null,
    [filteredReports, selectedReportId]
  );

  const regionalOptions = useMemo(
    () => collectDistinctValues(decoratedReports.map((row) => row.regional)),
    [decoratedReports]
  );
  const reportTypeOptions = useMemo(
    () => collectDistinctValues(decoratedReports.map((row) => row.type)),
    [decoratedReports]
  );
  const periodOptions = useMemo(
    () => collectDistinctValues(decoratedReports.map((row) => row.period)),
    [decoratedReports]
  );

  const totalPages = Math.max(1, Math.ceil(filteredReports.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedReports = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredReports.slice(start, start + PAGE_SIZE);
  }, [filteredReports, safePage]);
  const pageStart = filteredReports.length > 0 ? (safePage - 1) * PAGE_SIZE + 1 : 0;
  const pageEnd = Math.min(filteredReports.length, safePage * PAGE_SIZE);
  const visiblePages = useMemo(() => {
    const totalVisible = Math.min(totalPages, 5);
    const start = Math.max(1, Math.min(safePage - 2, totalPages - totalVisible + 1));
    return Array.from({ length: totalVisible }, (_, index) => start + index);
  }, [safePage, totalPages]);

  const distributionTotal = useMemo(
    () => DISTRIBUTION.reduce((accumulator, item) => accumulator + Number(item.value || 0), 0),
    []
  );
  const distributionStyle = useMemo(
    () => buildDistributionDonutStyle(DISTRIBUTION, distributionTotal),
    [distributionTotal]
  );

  const costByCategoryMax = useMemo(
    () => Math.max(...COST_BY_CATEGORY.map((item) => Number(item.amount || 0)), 1),
    []
  );
  const trendMax = useMemo(
    () => Math.max(...MONTHLY_TREND.map((item) => Number(item.amount || 0)), 1),
    []
  );
  const trendPolyline = useMemo(
    () => buildTrendPolyline(MONTHLY_TREND, trendMax),
    [trendMax]
  );

  const reportMetrics = useMemo(() => {
    const resolvedIncidents =
      overview && overview.kpis ? Number(overview.kpis.closedThisMonth || 0) : 0;
    return {
      monthCost: "RD$ 1.2M",
      fleetAvailability: "91%",
      resolvedIncidents: resolvedIncidents || 18,
      completedMaintenance: 28,
    };
  }, [overview]);

  const pendingReviewCount = useMemo(
    () => filteredReports.filter((row) => row.statusCode === "PENDIENTE").length,
    [filteredReports]
  );

  function handleGenerateReport() {
    setActionMessage("Flujo visual listo para generar reporte.");
  }

  function handleExportReport() {
    window.open(getCsvExportUrl(), "_blank", "noopener,noreferrer");
    setActionMessage("Exportacion iniciada.");
  }

  function handleOpenPrintableReport() {
    window.open(getPrintableReportUrl(), "_blank", "noopener,noreferrer");
  }

  return (
    <main className="route-content reports-route-v2">
      <section className="reports-toolbar-v2">
        <div className="reports-toolbar-actions-v2">
          <button type="button" className="small-btn primary reports-cta-btn-v2" onClick={handleGenerateReport}>
            <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
              <path d="M12 5v14M5 12h14"></path>
            </svg>
            Generar reporte
          </button>

          <button type="button" className="small-btn reports-outline-btn-v2" onClick={handleExportReport}>
            <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
              <path d="M12 4v11"></path>
              <path d="M8 10l4 4 4-4"></path>
              <path d="M5 18h14"></path>
            </svg>
            Exportar
          </button>

          <p className="form-message muted">{actionMessage}</p>
          {errorMessage ? <p className="module-inline-alert">{errorMessage}</p> : null}
        </div>

        <div className="reports-toolbar-filters-v2">
          <label className="reports-select-wrap-v2">
            <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
              <path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11z"></path>
              <circle cx="12" cy="10" r="2.7"></circle>
            </svg>
            <select value={regionalFilter} onChange={(event) => setRegionalFilter(event.target.value)}>
              <option value="">Regional</option>
              {regionalOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="reports-select-wrap-v2">
            <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
              <rect x="5" y="4" width="14" height="16" rx="2"></rect>
              <path d="M8 9h8M8 13h8M8 17h5"></path>
            </svg>
            <select value={reportTypeFilter} onChange={(event) => setReportTypeFilter(event.target.value)}>
              <option value="">Tipo de reporte</option>
              {reportTypeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="reports-select-wrap-v2">
            <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
              <rect x="4" y="5" width="16" height="15" rx="2"></rect>
              <path d="M8 3.8v2.4M16 3.8v2.4M4 9h16"></path>
            </svg>
            <select value={periodFilter} onChange={(event) => setPeriodFilter(event.target.value)}>
              <option value="">Periodo</option>
              {periodOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="reports-select-wrap-v2">
            <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
              <path d="M4 7h16"></path>
              <path d="M4 12h16"></path>
              <path d="M4 17h16"></path>
            </svg>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="">Estado</option>
              <option value="COMPLETADO">Completado</option>
              <option value="EN_REVISION">En revision</option>
              <option value="PENDIENTE">Pendiente</option>
            </select>
          </label>

          <label className="reports-search-wrap-v2" htmlFor="reportsSearch">
            <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
              <circle cx="11" cy="11" r="7"></circle>
              <path d="M20 20l-3.5-3.5"></path>
            </svg>
            <input
              id="reportsSearch"
              type="search"
              placeholder="Buscar por bus, codigo o reporte"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </label>
        </div>
      </section>

      <section className="reports-kpi-grid-v2">
        <article className="panel reports-kpi-card-v2">
          <span className="reports-kpi-icon-v2 tone-blue" aria-hidden="true">
            <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
              <circle cx="12" cy="12" r="8"></circle>
              <path d="M12 8v8"></path>
              <path d="M9.3 9.8c.7-1 1.6-1.5 2.7-1.5 1.7 0 2.8.9 2.8 2.2 0 3-5.5 1.6-5.5 4.7 0 1.4 1.2 2.3 2.9 2.3 1.3 0 2.3-.4 3-1.4"></path>
            </svg>
          </span>
          <div className="reports-kpi-copy-v2">
            <p>Costo total del mes</p>
            <strong>{reportMetrics.monthCost}</strong>
            <small>12% vs. mes anterior</small>
          </div>
        </article>

        <article className="panel reports-kpi-card-v2">
          <span className="reports-kpi-icon-v2 tone-green" aria-hidden="true">
            <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
              <path d="M12 4v8h8"></path>
              <circle cx="12" cy="12" r="8"></circle>
            </svg>
          </span>
          <div className="reports-kpi-copy-v2">
            <p>Disponibilidad de flota</p>
            <strong>{reportMetrics.fleetAvailability}</strong>
            <small>3% vs. mes anterior</small>
          </div>
        </article>

        <article className="panel reports-kpi-card-v2">
          <span className="reports-kpi-icon-v2 tone-gold" aria-hidden="true">
            <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
              <path d="M12 4l9 16H3z"></path>
              <path d="M12 9v4"></path>
              <circle cx="12" cy="16.5" r="0.8"></circle>
            </svg>
          </span>
          <div className="reports-kpi-copy-v2">
            <p>Incidencias resueltas</p>
            <strong>{reportMetrics.resolvedIncidents}</strong>
            <small>20% vs. mes anterior</small>
          </div>
        </article>

        <article className="panel reports-kpi-card-v2">
          <span className="reports-kpi-icon-v2 tone-green" aria-hidden="true">
            <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
              <circle cx="12" cy="12" r="8"></circle>
              <path d="M8.5 12.2l2.3 2.3 4.7-4.7"></path>
            </svg>
          </span>
          <div className="reports-kpi-copy-v2">
            <p>Mantenimientos completados</p>
            <strong>{reportMetrics.completedMaintenance}</strong>
            <small>22% vs. mes anterior</small>
          </div>
        </article>
      </section>

      <section className="reports-main-grid-v2">
        <section className="panel reports-summary-card-v2">
          <div className="reports-card-header-v2">
            <h2>Resumen de reportes</h2>
          </div>

          <div className="reports-chart-grid-v2">
            <article className="reports-chart-block-v2">
              <header>
                <h3>Costos por categoria</h3>
                <span>(RD$)</span>
              </header>
              <div className="reports-cost-bars-v2">
                {COST_BY_CATEGORY.map((item) => (
                  <div key={item.label} className="reports-cost-col-v2">
                    <strong>{formatCompactCurrency(item.amount)}</strong>
                    <div className="reports-cost-bar-track-v2">
                      <div
                        className={`reports-cost-bar-fill-v2 ${item.className}`}
                        style={{ height: `${(item.amount / costByCategoryMax) * 100}%` }}
                      ></div>
                    </div>
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="reports-chart-block-v2">
              <header>
                <h3>Tendencia mensual</h3>
                <span>(RD$)</span>
              </header>
              <div className="reports-trend-wrap-v2">
                <svg viewBox="0 0 520 180" role="img" aria-label="Tendencia mensual">
                  <path className="reports-trend-grid-v2" d="M40 20V160H500"></path>
                  <polyline className="reports-trend-line-v2" points={trendPolyline}></polyline>
                  {MONTHLY_TREND.map((item, index) => {
                    const x = 40 + (index * 460) / Math.max(MONTHLY_TREND.length - 1, 1);
                    const y = 160 - (item.amount / trendMax) * 140;
                    return (
                      <g key={item.month}>
                        <circle cx={x} cy={y} r="4.8" className="reports-trend-dot-v2"></circle>
                        <text x={x} y={y - 10} className="reports-trend-value-v2" textAnchor="middle">
                          {formatCompactCurrency(item.amount)}
                        </text>
                        <text x={x} y={174} className="reports-trend-month-v2" textAnchor="middle">
                          {item.month}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </article>
          </div>

          <div className="reports-generated-v2">
            <h3>Reportes generados</h3>
            <div className="table-wrap reports-table-wrap-v2">
              <table className="reports-table-v2">
                <thead>
                  <tr>
                    <th>Codigo</th>
                    <th>Tipo</th>
                    <th>Periodo</th>
                    <th>Generado por</th>
                    <th>Fecha</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedReports.length === 0 ? (
                    <tr>
                      <td colSpan="7">No hay reportes para mostrar.</td>
                    </tr>
                  ) : null}

                  {paginatedReports.map((row) => (
                    <tr key={row.id} className={String(row.id) === String(selectedReportId) ? "table-row-selected" : ""}>
                      <td>
                        <button
                          type="button"
                          className="table-link-btn reports-row-link-v2"
                          onClick={() => setSelectedReportId(String(row.id))}
                        >
                          {row.code}
                        </button>
                      </td>
                      <td>{row.type}</td>
                      <td>{row.period}</td>
                      <td>{row.generatedBy}</td>
                      <td>{row.dateLabel}</td>
                      <td>
                        <span className={`reports-status-pill-v2 ${row.statusClass}`}>{row.statusLabel}</span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="reports-row-action-v2"
                          aria-label={`Acciones para ${row.code}`}
                          onClick={handleOpenPrintableReport}
                        >
                          <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
                            <circle cx="12" cy="6.5" r="1.4"></circle>
                            <circle cx="12" cy="12" r="1.4"></circle>
                            <circle cx="12" cy="17.5" r="1.4"></circle>
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="reports-pagination-v2">
              <p className="table-pagination-meta">
                Mostrando {pageStart} a {pageEnd} de {filteredReports.length} reportes
              </p>

              <div className="reports-pagination-controls-v2">
                <button
                  className="reports-page-arrow-v2"
                  type="button"
                  onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                  disabled={safePage <= 1}
                  aria-label="Pagina anterior"
                >
                  <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
                    <path d="M14.5 7.5L10 12l4.5 4.5"></path>
                  </svg>
                </button>

                {visiblePages.map((pageNumber) => (
                  <button
                    key={pageNumber}
                    className={`reports-page-number-v2 ${safePage === pageNumber ? "active" : ""}`}
                    type="button"
                    onClick={() => setPage(pageNumber)}
                  >
                    {pageNumber}
                  </button>
                ))}

                <button
                  className="reports-page-arrow-v2"
                  type="button"
                  onClick={() => setPage((currentPage) => Math.min(totalPages, currentPage + 1))}
                  disabled={safePage >= totalPages}
                  aria-label="Pagina siguiente"
                >
                  <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
                    <path d="M9.5 7.5L14 12l-4.5 4.5"></path>
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {pendingReviewCount > 0 ? (
            <div className="reports-alert-banner-v2">
              <span className="reports-alert-icon-v2" aria-hidden="true">
                <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
                  <path d="M12 4l9 16H3z"></path>
                  <path d="M12 9v4"></path>
                  <circle cx="12" cy="16.5" r="0.8"></circle>
                </svg>
              </span>
              <p>Tienes {pendingReviewCount} reportes programados pendientes de revision.</p>
              <button type="button">Ver ahora</button>
            </div>
          ) : null}
        </section>

        <aside className="reports-side-stack-v2">
          <section className="panel reports-distribution-card-v2">
            <div className="reports-card-header-v2">
              <h2>Distribucion general</h2>
            </div>

            <div className="reports-distribution-body-v2">
              <div className="reports-distribution-donut-v2" style={distributionStyle}>
                <div className="reports-distribution-center-v2">
                  <span>Total</span>
                  <strong>{distributionTotal}</strong>
                  <small>reportes</small>
                </div>
              </div>

              <ul className="reports-distribution-legend-v2">
                {DISTRIBUTION.map((item) => (
                  <li key={item.label}>
                    <span className={`dot ${item.colorClass}`}></span>
                    {item.label}
                    <strong>
                      {item.value} ({resolvePercent(item.value, distributionTotal)}%)
                    </strong>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="panel reports-detail-card-v2">
            <div className="reports-card-header-v2">
              <h2>Detalle del reporte</h2>
            </div>

            {!selectedReport ? <p className="module-description">Selecciona un reporte para ver detalle.</p> : null}

            {selectedReport ? (
              <div className="reports-detail-body-v2">
                <div className="reports-detail-hero-v2">
                  <div className="reports-detail-icon-v2" aria-hidden="true">
                    <svg viewBox="0 0 120 120" role="img" aria-hidden="true">
                      <rect x="16" y="14" width="62" height="92" rx="8"></rect>
                      <rect x="40" y="8" width="16" height="10" rx="3"></rect>
                      <path d="M30 42h34M30 56h34M30 70h24"></path>
                      <path d="M72 82l23-23 9 9-23 23h-9z"></path>
                      <circle cx="66" cy="86" r="7"></circle>
                      <path d="M90 66v18M81 75h18"></path>
                    </svg>
                  </div>

                  <dl className="reports-detail-grid-v2">
                    <div>
                      <dt>Codigo:</dt>
                      <dd>{selectedReport.code}</dd>
                    </div>
                    <div>
                      <dt>Tipo:</dt>
                      <dd>{selectedReport.type}</dd>
                    </div>
                    <div>
                      <dt>Periodo:</dt>
                      <dd>{selectedReport.period}</dd>
                    </div>
                    <div>
                      <dt>Generado por:</dt>
                      <dd>{selectedReport.generatedBy}</dd>
                    </div>
                    <div>
                      <dt>Fecha:</dt>
                      <dd>{selectedReport.dateLabel}</dd>
                    </div>
                    <div>
                      <dt>Formato:</dt>
                      <dd>{selectedReport.format}</dd>
                    </div>
                    <div>
                      <dt>Estado:</dt>
                      <dd>
                        <span className={`reports-status-pill-v2 ${selectedReport.statusClass}`}>
                          {selectedReport.statusLabel}
                        </span>
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="reports-detail-extra-v2">
                  <p>
                    <strong>Resumen del reporte:</strong> {selectedReport.summary}
                  </p>
                </div>

                <button type="button" className="small-btn reports-full-record-btn-v2" onClick={handleOpenPrintableReport}>
                  Ver reporte completo
                </button>
              </div>
            ) : null}
          </section>
        </aside>
      </section>
    </main>
  );
}

function mapReportPresentation(row) {
  const config = REPORT_STATUS_CONFIG[row.statusCode] || REPORT_STATUS_CONFIG.PENDIENTE;
  return {
    ...row,
    statusLabel: config.label,
    statusClass: config.className,
    dateLabel: formatDateLabel(row.generatedAt),
  };
}

function buildReportSeed() {
  const today = new Date();
  const rows = [
    {
      id: 1,
      code: "REP-2024-0187",
      type: "Costos de mantenimiento",
      period: "Mayo 2024",
      regional: "Regional 10",
      busCode: "BUS-1033",
      generatedBy: "Carlos Mendez",
      generatedAt: addDays(today, -2),
      format: "PDF",
      statusCode: "COMPLETADO",
      summary:
        "El costo total de mantenimiento aumento un 12% respecto al mes anterior, principalmente por mayor consumo de repuestos y servicios externos.",
    },
    {
      id: 2,
      code: "REP-2024-0186",
      type: "Incidencias",
      period: "Mayo 2024",
      regional: "Regional 08",
      busCode: "BUS-1041",
      generatedBy: "Pedro Diaz",
      generatedAt: addDays(today, -3),
      format: "PDF",
      statusCode: "COMPLETADO",
      summary: "Se registraron menos incidencias criticas y mejora en tiempos de respuesta.",
    },
    {
      id: 3,
      code: "REP-2024-0185",
      type: "Disponibilidad de flota",
      period: "Abril 2024",
      regional: "Regional 15",
      busCode: "BUS-1058",
      generatedBy: "Luis Herrera",
      generatedAt: addDays(today, -5),
      format: "XLSX",
      statusCode: "EN_REVISION",
      summary: "La disponibilidad promedio se sostuvo sobre 90% con mejoras en rutas troncales.",
    },
    {
      id: 4,
      code: "REP-2024-0184",
      type: "Costos operativos",
      period: "Abril 2024",
      regional: "Regional 04",
      busCode: "BUS-1012",
      generatedBy: "Ramon Pena",
      generatedAt: addDays(today, -6),
      format: "PDF",
      statusCode: "EN_REVISION",
      summary: "Incremento de costos variables por ajustes de neumáticos y combustible.",
    },
    {
      id: 5,
      code: "REP-2024-0183",
      type: "Resumen general",
      period: "Marzo 2024",
      regional: "Regional 06",
      busCode: "BUS-1043",
      generatedBy: "Jose Castillo",
      generatedAt: addDays(today, -7),
      format: "PDF",
      statusCode: "PENDIENTE",
      summary: "Consolidado operativo pendiente de validacion final de supervision.",
    },
  ];

  const typePool = [
    "Costos de mantenimiento",
    "Incidencias",
    "Disponibilidad de flota",
    "Costos operativos",
    "Resumen general",
    "Rendimiento de talleres",
  ];
  const regionalPool = [
    "Regional 01",
    "Regional 03",
    "Regional 05",
    "Regional 07",
    "Regional 09",
    "Regional 11",
  ];
  const periodPool = ["Mayo 2024", "Abril 2024", "Marzo 2024", "Febrero 2024"];
  const generatedByPool = [
    "Carlos Mendez",
    "Pedro Diaz",
    "Luis Herrera",
    "Ramon Pena",
    "Jose Castillo",
    "Miguel Ortiz",
  ];
  const statusPool = [
    "COMPLETADO",
    "COMPLETADO",
    "EN_REVISION",
    "PENDIENTE",
  ];

  let sequence = 182;
  for (let index = 0; index < 13; index += 1) {
    rows.push({
      id: rows.length + 1,
      code: `REP-2024-0${sequence}`,
      type: typePool[index % typePool.length],
      period: periodPool[index % periodPool.length],
      regional: regionalPool[index % regionalPool.length],
      busCode: `BUS-${1060 + index}`,
      generatedBy: generatedByPool[index % generatedByPool.length],
      generatedAt: addDays(today, -8 - index),
      format: index % 3 === 0 ? "XLSX" : "PDF",
      statusCode: statusPool[index % statusPool.length],
      summary: "Reporte consolidado para evaluacion operativa y seguimiento de acciones.",
    });
    sequence -= 1;
  }

  return rows;
}

function buildTrendPolyline(items, maxAmount) {
  if (!Array.isArray(items) || items.length === 0 || !maxAmount) {
    return "";
  }

  return items
    .map((item, index) => {
      const x = 40 + (index * 460) / Math.max(items.length - 1, 1);
      const y = 160 - ((Number(item.amount) || 0) / maxAmount) * 140;
      return `${x},${y}`;
    })
    .join(" ");
}

function buildDistributionDonutStyle(items, total) {
  if (!Array.isArray(items) || items.length === 0 || !total) {
    return { background: "conic-gradient(#2f71db 0 100%)" };
  }

  const palette = ["#2f71db", "#f3ae24", "#e2534d", "#31af62"];
  let cursor = 0;
  const segments = items.map((item, index) => {
    const value = Number(item.value || 0);
    const percent = (value / total) * 100;
    const start = cursor;
    const end = cursor + percent;
    cursor = end;
    return `${palette[index % palette.length]} ${start}% ${end}%`;
  });

  if (cursor < 100) {
    segments.push(`#2f71db ${cursor}% 100%`);
  }

  return {
    background: `conic-gradient(${segments.join(", ")})`,
  };
}

function collectDistinctValues(values) {
  return [...new Set((values || []).map((value) => String(value || "").trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "es", { sensitivity: "base" })
  );
}

function formatCompactCurrency(value) {
  const amount = Number(value || 0);
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(2)}M`;
  }
  if (amount >= 1000) {
    return `${Math.round(amount / 1000)}K`;
  }
  return `${amount}`;
}

function resolvePercent(value, total) {
  if (!total) {
    return 0;
  }
  return Math.round((Number(value || 0) / Number(total)) * 100);
}

function formatDateLabel(value) {
  const date = value instanceof Date ? value : new Date(String(value || ""));
  if (!Number.isFinite(date.getTime())) {
    return "N/D";
  }
  return date.toLocaleDateString("es-DO");
}

function addDays(dateValue, daysToAdd) {
  const date = new Date(dateValue);
  date.setDate(date.getDate() + Number(daysToAdd || 0));
  return date;
}
