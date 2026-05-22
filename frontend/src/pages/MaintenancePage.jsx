import { useEffect, useMemo, useState } from "react";

const PAGE_SIZE = 6;

const STATUS_CONFIG = {
  PROGRAMADO: {
    label: "Programado",
    className: "tone-programmed",
    bucket: "programmed",
  },
  EN_EJECUCION: {
    label: "En ejecucion",
    className: "tone-running",
    bucket: "running",
  },
  PROXIMO_VENCER: {
    label: "Proximo a vencer",
    className: "tone-upcoming",
    bucket: "upcoming",
  },
  COMPLETADO: {
    label: "Completado",
    className: "tone-completed",
    bucket: "completed",
  },
};

const MAINTENANCE_ROWS = buildMaintenanceSeed();

export default function MaintenancePage() {
  const [regionalFilter, setRegionalFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [page, setPage] = useState(1);
  const [selectedMaintenanceId, setSelectedMaintenanceId] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  const decoratedRows = useMemo(
    () => MAINTENANCE_ROWS.map((row) => mapMaintenanceRowPresentation(row)),
    []
  );

  const filteredRows = useMemo(() => {
    return decoratedRows.filter((row) => {
      if (regionalFilter && row.regional !== regionalFilter) {
        return false;
      }

      if (typeFilter && row.type !== typeFilter) {
        return false;
      }

      if (statusFilter && row.statusCode !== statusFilter) {
        return false;
      }

      if (!matchDateFilter(row.scheduledDate, row.statusCode, dateFilter)) {
        return false;
      }

      if (!searchTerm.trim()) {
        return true;
      }

      const query = searchTerm.trim().toLowerCase();
      return [
        row.code,
        row.busCode,
        row.busFicha,
        row.type,
        row.responsible,
        row.regional,
      ]
        .map((value) => String(value || "").toLowerCase())
        .some((value) => value.includes(query));
    });
  }, [decoratedRows, regionalFilter, typeFilter, statusFilter, dateFilter, searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [regionalFilter, typeFilter, statusFilter, dateFilter, searchTerm]);

  useEffect(() => {
    if (!filteredRows.length) {
      setSelectedMaintenanceId("");
      return;
    }

    const selectedExists = filteredRows.some(
      (row) => String(row.id) === String(selectedMaintenanceId)
    );
    if (!selectedExists) {
      setSelectedMaintenanceId(String(filteredRows[0].id));
    }
  }, [filteredRows, selectedMaintenanceId]);

  const selectedMaintenance = useMemo(
    () => filteredRows.find((row) => String(row.id) === String(selectedMaintenanceId)) || null,
    [filteredRows, selectedMaintenanceId]
  );

  const maintenanceMetrics = useMemo(() => {
    const summary = {
      programmed: 0,
      running: 0,
      upcoming: 0,
      completed: 0,
    };

    decoratedRows.forEach((row) => {
      if (row.statusBucket === "programmed") {
        summary.programmed += 1;
        return;
      }
      if (row.statusBucket === "running") {
        summary.running += 1;
        return;
      }
      if (row.statusBucket === "upcoming") {
        summary.upcoming += 1;
        return;
      }
      if (row.statusBucket === "completed") {
        summary.completed += 1;
      }
    });

    return {
      ...summary,
      total: decoratedRows.length,
      completedThisMonth: 28,
    };
  }, [decoratedRows]);

  const maintenanceStatusSummary = useMemo(() => {
    const summary = {
      programmed: 0,
      running: 0,
      upcoming: 0,
      completed: 0,
    };

    filteredRows.forEach((row) => {
      if (row.statusBucket === "programmed") {
        summary.programmed += 1;
        return;
      }
      if (row.statusBucket === "running") {
        summary.running += 1;
        return;
      }
      if (row.statusBucket === "upcoming") {
        summary.upcoming += 1;
        return;
      }
      if (row.statusBucket === "completed") {
        summary.completed += 1;
      }
    });

    const total = filteredRows.length;
    return {
      ...summary,
      total,
      programmedPercent: resolvePercent(summary.programmed, total),
      runningPercent: resolvePercent(summary.running, total),
      upcomingPercent: resolvePercent(summary.upcoming, total),
      completedPercent: resolvePercent(summary.completed, total),
    };
  }, [filteredRows]);

  const upcomingPlanCount = useMemo(
    () => filteredRows.filter((row) => row.statusCode === "PROXIMO_VENCER").length,
    [filteredRows]
  );

  const regionalOptions = useMemo(
    () => collectDistinctValues(decoratedRows.map((row) => row.regional)),
    [decoratedRows]
  );

  const typeOptions = useMemo(
    () => collectDistinctValues(decoratedRows.map((row) => row.type)),
    [decoratedRows]
  );

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedRows = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [filteredRows, safePage]);

  const pageStart = filteredRows.length > 0 ? (safePage - 1) * PAGE_SIZE + 1 : 0;
  const pageEnd = Math.min(filteredRows.length, safePage * PAGE_SIZE);
  const visiblePages = useMemo(() => {
    const totalVisible = Math.min(totalPages, 5);
    const start = Math.max(1, Math.min(safePage - 2, totalPages - totalVisible + 1));
    return Array.from({ length: totalVisible }, (_, index) => start + index);
  }, [safePage, totalPages]);

  function handleScheduleMaintenance() {
    setActionMessage("Flujo visual listo para programar mantenimiento.");
  }

  function handleExportMaintenance() {
    const csv = buildMaintenanceCsv(filteredRows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = `mantenimientos_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(blobUrl);
    setActionMessage("Exportacion CSV lista para abrir en Excel.");
  }

  return (
    <main className="route-content maintenance-route-v2">
      <section className="maintenance-toolbar-v2">
        <div className="maintenance-toolbar-actions-v2">
          <button
            type="button"
            className="small-btn primary maintenance-cta-btn-v2"
            onClick={handleScheduleMaintenance}
          >
            <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
              <path d="M12 5v14M5 12h14"></path>
            </svg>
            Programar mantenimiento
          </button>

          <button
            type="button"
            className="small-btn maintenance-outline-btn-v2"
            onClick={handleExportMaintenance}
          >
            <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
              <path d="M12 4v11"></path>
              <path d="M8 10l4 4 4-4"></path>
              <path d="M5 18h14"></path>
            </svg>
            Exportar
          </button>

          <p className="form-message muted">{actionMessage}</p>
        </div>

        <div className="maintenance-toolbar-filters-v2">
          <label className="maintenance-select-wrap-v2">
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

          <label className="maintenance-select-wrap-v2">
            <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
              <path d="M7 7h10l4 5-4 5H7l-4-5z"></path>
              <circle cx="10.3" cy="12" r="1.1"></circle>
            </svg>
            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
              <option value="">Tipo</option>
              {typeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="maintenance-select-wrap-v2">
            <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
              <path d="M4 7h16"></path>
              <path d="M4 12h16"></path>
              <path d="M4 17h16"></path>
            </svg>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="">Estado</option>
              <option value="PROGRAMADO">Programado</option>
              <option value="EN_EJECUCION">En ejecucion</option>
              <option value="PROXIMO_VENCER">Proximo a vencer</option>
              <option value="COMPLETADO">Completado</option>
            </select>
          </label>

          <label className="maintenance-select-wrap-v2">
            <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
              <rect x="4" y="5" width="16" height="15" rx="2"></rect>
              <path d="M8 3.8v2.4M16 3.8v2.4M4 9h16"></path>
            </svg>
            <select value={dateFilter} onChange={(event) => setDateFilter(event.target.value)}>
              <option value="">Fecha</option>
              <option value="next7">Proximos 7 dias</option>
              <option value="next30">Proximos 30 dias</option>
              <option value="expired">Vencidos</option>
            </select>
          </label>

          <label className="maintenance-search-wrap-v2" htmlFor="maintenanceSearch">
            <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
              <circle cx="11" cy="11" r="7"></circle>
              <path d="M20 20l-3.5-3.5"></path>
            </svg>
            <input
              id="maintenanceSearch"
              type="search"
              placeholder="Buscar por bus, ficha o mantenimiento"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </label>
        </div>
      </section>

      <section className="maintenance-kpi-grid-v2">
        <article className="panel maintenance-kpi-card-v2">
          <span className="maintenance-kpi-icon-v2 tone-blue" aria-hidden="true">
            <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
              <rect x="4" y="5" width="11" height="15" rx="2"></rect>
              <path d="M8 3.8v2.4M12 3.8v2.4M4 9h11"></path>
              <path d="M13 16l2.2 2.2L20 13.4"></path>
              <circle cx="16.6" cy="15.8" r="3.5"></circle>
            </svg>
          </span>
          <div className="maintenance-kpi-copy-v2">
            <p>Mantenimientos programados</p>
            <strong>{maintenanceMetrics.programmed}</strong>
            <small>18% vs. semana anterior</small>
          </div>
        </article>

        <article className="panel maintenance-kpi-card-v2">
          <span className="maintenance-kpi-icon-v2 tone-orange" aria-hidden="true">
            <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
              <path d="M7.5 8.2l8.3 8.3"></path>
              <path d="M13.9 4.4a2.5 2.5 0 0 1 3.5 3.5l-2 2-3.5-3.5z"></path>
              <path d="M6.6 11.3L4.5 13.4a2.5 2.5 0 0 0 3.5 3.5l2.1-2.1"></path>
            </svg>
          </span>
          <div className="maintenance-kpi-copy-v2">
            <p>En ejecucion</p>
            <strong>{maintenanceMetrics.running}</strong>
            <small>9% vs. semana anterior</small>
          </div>
        </article>

        <article className="panel maintenance-kpi-card-v2">
          <span className="maintenance-kpi-icon-v2 tone-gold" aria-hidden="true">
            <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
              <rect x="4" y="5" width="16" height="15" rx="2"></rect>
              <path d="M8 3.8v2.4M16 3.8v2.4M4 9h16"></path>
              <path d="M12 12v3.4"></path>
              <circle cx="12" cy="17.1" r="0.8"></circle>
            </svg>
          </span>
          <div className="maintenance-kpi-copy-v2">
            <p>Proximos a vencer</p>
            <strong>{maintenanceMetrics.upcoming}</strong>
            <small>13% vs. semana anterior</small>
          </div>
        </article>

        <article className="panel maintenance-kpi-card-v2">
          <span className="maintenance-kpi-icon-v2 tone-green" aria-hidden="true">
            <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
              <circle cx="12" cy="12" r="8"></circle>
              <path d="M8.5 12.2l2.3 2.3 4.7-4.7"></path>
            </svg>
          </span>
          <div className="maintenance-kpi-copy-v2">
            <p>Completados este mes</p>
            <strong>{maintenanceMetrics.completedThisMonth}</strong>
            <small>22% vs. mes anterior</small>
          </div>
        </article>
      </section>

      <section className="maintenance-main-grid-v2">
        <section className="panel maintenance-list-card-v2">
          <div className="maintenance-card-header-v2">
            <h2>Listado de mantenimientos</h2>
          </div>

          <div className="table-wrap maintenance-table-wrap-v2">
            <table className="maintenance-table-v2">
              <thead>
                <tr>
                  <th>Codigo</th>
                  <th>Bus</th>
                  <th>Tipo</th>
                  <th>Programado</th>
                  <th>Kilometraje</th>
                  <th>Estado</th>
                  <th>Responsable</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRows.length === 0 ? (
                  <tr>
                    <td colSpan="8">No hay mantenimientos para mostrar.</td>
                  </tr>
                ) : null}

                {paginatedRows.map((row) => (
                  <tr
                    key={row.id}
                    className={String(row.id) === String(selectedMaintenanceId) ? "table-row-selected" : ""}
                  >
                    <td>
                      <button
                        type="button"
                        className="table-link-btn maintenance-row-link-v2"
                        onClick={() => setSelectedMaintenanceId(String(row.id))}
                      >
                        {row.code}
                      </button>
                    </td>
                    <td>{row.busCode}</td>
                    <td>{row.type}</td>
                    <td>{row.scheduledLabel}</td>
                    <td>{row.targetMileageLabel}</td>
                    <td>
                      <span className={`maintenance-status-pill-v2 ${row.statusClass}`}>
                        {row.statusLabel}
                      </span>
                    </td>
                    <td>{row.responsible}</td>
                    <td>
                      <button
                        type="button"
                        className="maintenance-row-action-v2"
                        aria-label={`Acciones para ${row.code}`}
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

          <div className="maintenance-pagination-v2">
            <p className="table-pagination-meta">
              Mostrando {pageStart} a {pageEnd} de {filteredRows.length} mantenimientos
            </p>

            <div className="maintenance-pagination-controls-v2">
              <button
                className="maintenance-page-arrow-v2"
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
                  className={`maintenance-page-number-v2 ${safePage === pageNumber ? "active" : ""}`}
                  type="button"
                  onClick={() => setPage(pageNumber)}
                >
                  {pageNumber}
                </button>
              ))}

              <button
                className="maintenance-page-arrow-v2"
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

          {upcomingPlanCount > 0 ? (
            <div className="maintenance-alert-banner-v2">
              <span className="maintenance-alert-icon-v2" aria-hidden="true">
                <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
                  <path d="M12 4l9 16H3z"></path>
                  <path d="M12 9v4"></path>
                  <circle cx="12" cy="16.5" r="0.8"></circle>
                </svg>
              </span>
              <p>
                Tienes {upcomingPlanCount} mantenimientos proximos a vencer que requieren planificacion.
              </p>
              <button type="button">Ver ahora</button>
            </div>
          ) : null}
        </section>

        <aside className="maintenance-side-stack-v2">
          <section className="panel maintenance-status-card-v2">
            <div className="maintenance-card-header-v2">
              <h2>Estado de mantenimientos</h2>
            </div>

            <div className="maintenance-status-body-v2">
              <div
                className="maintenance-status-donut-v2"
                style={buildMaintenanceDonutStyle(maintenanceStatusSummary)}
              >
                <div className="maintenance-status-center-v2">
                  <span>Total</span>
                  <strong>{maintenanceStatusSummary.total}</strong>
                  <small>mantenimientos</small>
                </div>
              </div>

              <ul className="maintenance-status-legend-v2">
                <li>
                  <span className="dot programmed"></span>
                  Programados
                  <strong>{maintenanceStatusSummary.programmed}</strong>
                </li>
                <li>
                  <span className="dot running"></span>
                  En ejecucion
                  <strong>{maintenanceStatusSummary.running}</strong>
                </li>
                <li>
                  <span className="dot upcoming"></span>
                  Proximos a vencer
                  <strong>{maintenanceStatusSummary.upcoming}</strong>
                </li>
                <li>
                  <span className="dot completed"></span>
                  Completados
                  <strong>{maintenanceStatusSummary.completed}</strong>
                </li>
              </ul>
            </div>
          </section>

          <section className="panel maintenance-detail-card-v2">
            <div className="maintenance-card-header-v2">
              <h2>Detalle de mantenimiento</h2>
            </div>

            {!selectedMaintenance ? (
              <p className="module-description">Selecciona un mantenimiento para ver el detalle.</p>
            ) : null}

            {selectedMaintenance ? (
              <div className="maintenance-detail-body-v2">
                <div className="maintenance-detail-hero-v2">
                  <div className="maintenance-detail-icon-v2" aria-hidden="true">
                    <svg viewBox="0 0 124 124" role="img" aria-hidden="true">
                      <rect x="12" y="14" width="62" height="90" rx="8"></rect>
                      <rect x="36" y="8" width="16" height="10" rx="3"></rect>
                      <path d="M24 38h38M24 52h38M24 66h38M24 80h24"></path>
                      <path d="M72 80h35v18H72z"></path>
                      <path d="M76 80v-7a5 5 0 0 1 5-5h17a5 5 0 0 1 5 5v7"></path>
                      <circle cx="81" cy="100" r="5"></circle>
                      <circle cx="98" cy="100" r="5"></circle>
                      <path d="M62 86l18-18 9 9-18 18"></path>
                    </svg>
                  </div>

                  <dl className="maintenance-detail-grid-v2">
                    <div>
                      <dt>Codigo:</dt>
                      <dd>{selectedMaintenance.code}</dd>
                    </div>
                    <div>
                      <dt>Bus:</dt>
                      <dd>{selectedMaintenance.busCode}</dd>
                    </div>
                    <div>
                      <dt>Ficha:</dt>
                      <dd>{selectedMaintenance.busFicha}</dd>
                    </div>
                    <div>
                      <dt>Tipo:</dt>
                      <dd>{selectedMaintenance.type}</dd>
                    </div>
                    <div>
                      <dt>Estado:</dt>
                      <dd>
                        <span className={`maintenance-status-pill-v2 ${selectedMaintenance.statusClass}`}>
                          {selectedMaintenance.statusLabel}
                        </span>
                      </dd>
                    </div>
                    <div>
                      <dt>Responsable:</dt>
                      <dd>{selectedMaintenance.responsible}</dd>
                    </div>
                    <div>
                      <dt>Fecha programada:</dt>
                      <dd>{selectedMaintenance.scheduledLabel}</dd>
                    </div>
                    <div>
                      <dt>Kilometraje objetivo:</dt>
                      <dd>{selectedMaintenance.targetMileageLabel}</dd>
                    </div>
                    <div>
                      <dt>Ultimo mantenimiento:</dt>
                      <dd>{selectedMaintenance.lastMaintenanceLabel}</dd>
                    </div>
                    <div>
                      <dt>Checklist:</dt>
                      <dd>{selectedMaintenance.checklistCount} tareas</dd>
                    </div>
                    <div>
                      <dt>Evidencias:</dt>
                      <dd>{selectedMaintenance.evidencesCount} fotos adjuntas</dd>
                    </div>
                  </dl>
                </div>

                <button type="button" className="small-btn maintenance-full-record-btn-v2">
                  Ver mantenimiento completo
                </button>
              </div>
            ) : null}
          </section>
        </aside>
      </section>
    </main>
  );
}

function buildMaintenanceSeed() {
  const today = getTodayStart();

  const firstRows = [
    {
      id: 1,
      code: "MAN-2024-3101",
      busCode: "BUS-1033",
      busFicha: "BUS-1033",
      type: "Revision general",
      regional: "Regional 10",
      scheduledDate: addDays(today, 1),
      targetMileage: 45000,
      statusCode: "PROGRAMADO",
      responsible: "Carlos Mendez",
      lastMaintenance: addDays(today, -12),
      checklistCount: 6,
      evidencesCount: 2,
    },
    {
      id: 2,
      code: "MAN-2024-3100",
      busCode: "BUS-1041",
      busFicha: "BUS-1041",
      type: "Cambio de filtros",
      regional: "Regional 08",
      scheduledDate: addDays(today, 3),
      targetMileage: 50000,
      statusCode: "EN_EJECUCION",
      responsible: "Pedro Diaz",
      lastMaintenance: addDays(today, -18),
      checklistCount: 4,
      evidencesCount: 3,
    },
    {
      id: 3,
      code: "MAN-2024-3099",
      busCode: "BUS-1058",
      busFicha: "BUS-1058",
      type: "Sistema de frenos",
      regional: "Regional 15",
      scheduledDate: addDays(today, 5),
      targetMileage: 55000,
      statusCode: "PROXIMO_VENCER",
      responsible: "Luis Herrera",
      lastMaintenance: addDays(today, -24),
      checklistCount: 5,
      evidencesCount: 4,
    },
    {
      id: 4,
      code: "MAN-2024-3098",
      busCode: "BUS-1012",
      busFicha: "BUS-1012",
      type: "Cambio de aceite",
      regional: "Regional 04",
      scheduledDate: addDays(today, -2),
      targetMileage: 62900,
      statusCode: "COMPLETADO",
      responsible: "Ramon Pena",
      lastMaintenance: addDays(today, -2),
      checklistCount: 6,
      evidencesCount: 2,
    },
    {
      id: 5,
      code: "MAN-2024-3097",
      busCode: "BUS-1061",
      busFicha: "BUS-1061",
      type: "Revision electrica",
      regional: "Regional 12",
      scheduledDate: addDays(today, 8),
      targetMileage: 98430,
      statusCode: "PROGRAMADO",
      responsible: "Jose Castillo",
      lastMaintenance: addDays(today, -28),
      checklistCount: 5,
      evidencesCount: 1,
    },
    {
      id: 6,
      code: "MAN-2024-3096",
      busCode: "BUS-1043",
      busFicha: "BUS-1043",
      type: "Inspeccion general",
      regional: "Regional 06",
      scheduledDate: addDays(today, 10),
      targetMileage: 45100,
      statusCode: "PROGRAMADO",
      responsible: "Miguel Ortiz",
      lastMaintenance: addDays(today, -20),
      checklistCount: 4,
      evidencesCount: 2,
    },
  ];

  const statusTargets = {
    PROGRAMADO: 10,
    EN_EJECUCION: 12,
    PROXIMO_VENCER: 9,
    COMPLETADO: 3,
  };

  const currentCounts = firstRows.reduce(
    (accumulator, row) => ({
      ...accumulator,
      [row.statusCode]: (accumulator[row.statusCode] || 0) + 1,
    }),
    {}
  );

  const statusQueue = [];
  Object.entries(statusTargets).forEach(([statusCode, target]) => {
    const current = Number(currentCounts[statusCode] || 0);
    const pending = Math.max(0, target - current);
    for (let index = 0; index < pending; index += 1) {
      statusQueue.push(statusCode);
    }
  });

  const typePool = [
    "Revision general",
    "Cambio de filtros",
    "Sistema de frenos",
    "Cambio de aceite",
    "Revision electrica",
    "Inspeccion general",
    "Neumaticos",
    "Sistema de enfriamiento",
  ];
  const regionalPool = [
    "Regional 01",
    "Regional 03",
    "Regional 05",
    "Regional 07",
    "Regional 09",
    "Regional 11",
    "Regional 13",
    "Regional 15",
  ];
  const responsiblePool = [
    "Carlos Mendez",
    "Pedro Diaz",
    "Luis Herrera",
    "Ramon Pena",
    "Jose Castillo",
    "Miguel Ortiz",
    "Adrian Soto",
    "Fernando Gil",
  ];

  let nextId = 7;
  let sequence = 3095;
  statusQueue.forEach((statusCode, index) => {
    const busNumber = 1062 + index;
    const code = `MAN-2024-${sequence}`;
    sequence -= 1;

    let scheduledDate = addDays(today, 2 + (index % 18));
    if (statusCode === "COMPLETADO") {
      scheduledDate = addDays(today, -1 - (index % 14));
    } else if (statusCode === "EN_EJECUCION") {
      scheduledDate = addDays(today, index % 5);
    } else if (statusCode === "PROXIMO_VENCER") {
      scheduledDate = addDays(today, 1 + (index % 6));
    }

    firstRows.push({
      id: nextId,
      code,
      busCode: `BUS-${busNumber}`,
      busFicha: `BUS-${busNumber}`,
      type: typePool[index % typePool.length],
      regional: regionalPool[index % regionalPool.length],
      scheduledDate,
      targetMileage: 42000 + index * 1700,
      statusCode,
      responsible: responsiblePool[index % responsiblePool.length],
      lastMaintenance: addDays(today, -10 - (index % 35)),
      checklistCount: 3 + (index % 5),
      evidencesCount: 1 + (index % 4),
    });

    nextId += 1;
  });

  return firstRows;
}

function mapMaintenanceRowPresentation(row) {
  const statusConfig = STATUS_CONFIG[row.statusCode] || STATUS_CONFIG.PROGRAMADO;
  return {
    ...row,
    statusLabel: statusConfig.label,
    statusClass: statusConfig.className,
    statusBucket: statusConfig.bucket,
    scheduledLabel: formatDateLabel(row.scheduledDate),
    targetMileageLabel: formatMileage(row.targetMileage),
    lastMaintenanceLabel: formatDateLabel(row.lastMaintenance),
  };
}

function buildMaintenanceDonutStyle(summary) {
  const programmedEnd = summary.programmedPercent;
  const runningEnd = programmedEnd + summary.runningPercent;
  const upcomingEnd = runningEnd + summary.upcomingPercent;

  return {
    background: `conic-gradient(
      #2f71db 0 ${programmedEnd}%,
      #ff8b1a ${programmedEnd}% ${runningEnd}%,
      #f4b71f ${runningEnd}% ${upcomingEnd}%,
      #31af62 ${upcomingEnd}% 100%
    )`,
  };
}

function matchDateFilter(dateValue, statusCode, dateFilter) {
  if (!dateFilter) {
    return true;
  }

  const today = getTodayStart();
  const targetDate = parseDateOnly(dateValue);
  if (!targetDate) {
    return false;
  }

  if (dateFilter === "expired") {
    return targetDate.getTime() < today.getTime() && statusCode !== "COMPLETADO";
  }

  const diffDays = Math.floor((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (dateFilter === "next7") {
    return diffDays >= 0 && diffDays <= 7;
  }
  if (dateFilter === "next30") {
    return diffDays >= 0 && diffDays <= 30;
  }
  return true;
}

function collectDistinctValues(values) {
  return [...new Set((values || []).map((value) => String(value || "").trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "es", { sensitivity: "base" })
  );
}

function resolvePercent(value, total) {
  if (!total) {
    return 0;
  }
  return Math.round((Number(value || 0) / Number(total)) * 100);
}

function formatMileage(value) {
  const safeValue = Number(value || 0);
  return `${safeValue.toLocaleString("en-US")} km`;
}

function formatDateLabel(value) {
  const parsedDate = parseDateOnly(value);
  if (!parsedDate) {
    return "N/D";
  }
  return parsedDate.toLocaleDateString("es-DO");
}

function parseDateOnly(value) {
  if (!value) {
    return null;
  }
  const parsed = value instanceof Date ? new Date(value) : new Date(String(value));
  if (!Number.isFinite(parsed.getTime())) {
    return null;
  }
  parsed.setHours(0, 0, 0, 0);
  return parsed;
}

function getTodayStart() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function addDays(dateValue, daysToAdd) {
  const baseDate = new Date(dateValue);
  baseDate.setDate(baseDate.getDate() + Number(daysToAdd || 0));
  return baseDate;
}

function buildMaintenanceCsv(rows) {
  const headers = [
    "codigo",
    "bus",
    "tipo",
    "regional",
    "programado",
    "kilometraje",
    "estado",
    "responsable",
  ];

  const lines = [headers.join(",")];
  (rows || []).forEach((row) => {
    lines.push(
      [
        row.code,
        row.busCode,
        row.type,
        row.regional,
        row.scheduledLabel,
        row.targetMileageLabel,
        row.statusLabel,
        row.responsible,
      ]
        .map(escapeCsvValue)
        .join(",")
    );
  });

  return lines.join("\n");
}

function escapeCsvValue(value) {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, "\"\"")}"`;
}
