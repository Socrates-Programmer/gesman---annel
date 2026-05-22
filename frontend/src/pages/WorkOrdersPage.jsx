import { useEffect, useMemo, useState } from "react";
import { fetchIncidents } from "../data/incidentsApi";
import { createWorkOrderFromIncident, listMechanics, listWorkOrders } from "../data/workOrdersLocalApi";

const TERMINAL_STATUS = new Set(["CERRADA", "RECHAZADA", "ANULADA", "APROBADA_OPERACIONES"]);
const PAGE_SIZE = 6;

export default function WorkOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [mechanics, setMechanics] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [mechanicFilter, setMechanicFilter] = useState("");
  const [regionalFilter, setRegionalFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [page, setPage] = useState(1);

  const [actionMessage, setActionMessage] = useState("");
  const [actionTone, setActionTone] = useState("muted");

  useEffect(() => {
    let isMounted = true;

    async function loadInitialData() {
      setIsLoading(true);
      setLoadError("");

      try {
        const incidentsResponse = await fetchIncidents({
          page: 1,
          limit: 250,
          includeClosed: true,
        });

        if (!isMounted) {
          return;
        }

        setIncidents(Array.isArray(incidentsResponse.rows) ? incidentsResponse.rows : []);
      } catch (error) {
        if (!isMounted) {
          return;
        }
        setLoadError(error && error.message ? error.message : "No se pudo cargar el catalogo de incidencias.");
        setIncidents([]);
      } finally {
        if (isMounted) {
          refreshLocalState();
          setIsLoading(false);
        }
      }
    }

    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, []);

  const incidentsById = useMemo(() => {
    const mapped = new Map();
    incidents.forEach((incident) => {
      mapped.set(Number(incident.id), incident);
    });
    return mapped;
  }, [incidents]);

  const decoratedOrders = useMemo(
    () => orders.map((order) => mapOrderPresentation(order, incidentsById)),
    [orders, incidentsById]
  );

  const filteredOrders = useMemo(() => {
    return decoratedOrders.filter((order) => {
      if (statusFilter && order.statusBucket !== statusFilter) {
        return false;
      }

      if (priorityFilter && order.priorityBucket !== priorityFilter) {
        return false;
      }

      if (mechanicFilter && String(order.assignedMechanicId || "") !== mechanicFilter) {
        return false;
      }

      if (regionalFilter && order.regional !== regionalFilter) {
        return false;
      }

      if (!searchTerm.trim()) {
        return true;
      }

      const query = searchTerm.trim().toLowerCase();
      return [
        order.code,
        order.busLabel,
        order.workType,
        order.assignedMechanicName,
        order.incidentCode,
      ]
        .map((value) => String(value || "").toLowerCase())
        .some((value) => value.includes(query));
    });
  }, [decoratedOrders, statusFilter, priorityFilter, mechanicFilter, regionalFilter, searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, priorityFilter, mechanicFilter, regionalFilter, searchTerm]);

  useEffect(() => {
    if (!filteredOrders.length) {
      setSelectedOrderId("");
      return;
    }

    const selectedExists = filteredOrders.some((order) => String(order.id) === String(selectedOrderId));
    if (!selectedExists) {
      setSelectedOrderId(String(filteredOrders[0].id));
    }
  }, [filteredOrders, selectedOrderId]);

  const selectedOrder = useMemo(
    () => filteredOrders.find((order) => String(order.id) === String(selectedOrderId)) || null,
    [filteredOrders, selectedOrderId]
  );

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedOrders = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredOrders.slice(start, start + PAGE_SIZE);
  }, [filteredOrders, safePage]);

  const pageStart = filteredOrders.length > 0 ? (safePage - 1) * PAGE_SIZE + 1 : 0;
  const pageEnd = Math.min(filteredOrders.length, safePage * PAGE_SIZE);

  const dashboardMetrics = useMemo(() => {
    const openOrders = decoratedOrders.filter((order) => !TERMINAL_STATUS.has(order.statusCode)).length;
    const inProgress = decoratedOrders.filter((order) =>
      ["ASIGNADA", "EN_DIAGNOSTICO", "EN_REPARACION", "EN_ESPERA_REPUESTOS"].includes(order.statusCode)
    ).length;
    const readyForReview = decoratedOrders.filter((order) =>
      ["LISTA_REVISION", "APROBADA_MANTENIMIENTO"].includes(order.statusCode)
    ).length;
    const closedThisMonth = decoratedOrders.filter((order) =>
      isDateInCurrentMonth(order.closedAt || order.updatedAt)
    ).length;

    return {
      openOrders,
      inProgress,
      readyForReview,
      closedThisMonth,
    };
  }, [decoratedOrders]);

  const orderStatusSummary = useMemo(() => {
    const summary = {
      assigned: 0,
      review: 0,
      repair: 0,
      closed: 0,
    };

    filteredOrders.forEach((order) => {
      if (["CREADA", "ASIGNADA"].includes(order.statusCode)) {
        summary.assigned += 1;
        return;
      }
      if (["EN_DIAGNOSTICO", "LISTA_REVISION", "APROBADA_MANTENIMIENTO"].includes(order.statusCode)) {
        summary.review += 1;
        return;
      }
      if (["EN_REPARACION", "EN_ESPERA_REPUESTOS"].includes(order.statusCode)) {
        summary.repair += 1;
        return;
      }
      if (TERMINAL_STATUS.has(order.statusCode)) {
        summary.closed += 1;
      }
    });

    const total = filteredOrders.length || 0;
    return {
      ...summary,
      total,
      assignedPercent: resolvePercent(summary.assigned, total),
      reviewPercent: resolvePercent(summary.review, total),
      repairPercent: resolvePercent(summary.repair, total),
      closedPercent: resolvePercent(summary.closed, total),
    };
  }, [filteredOrders]);

  const pendingApprovalCount = useMemo(
    () => decoratedOrders.filter((order) => order.statusCode === "LISTA_REVISION").length,
    [decoratedOrders]
  );

  function refreshLocalState() {
    const localOrders = listWorkOrders().sort((a, b) => {
      const timeA = Date.parse(a.updatedAt || a.createdAt || "");
      const timeB = Date.parse(b.updatedAt || b.createdAt || "");
      return (Number.isFinite(timeB) ? timeB : 0) - (Number.isFinite(timeA) ? timeA : 0);
    });
    setOrders(localOrders);
    setMechanics(listMechanics());
  }

  function setFeedback(message, tone = "muted") {
    setActionMessage(message);
    setActionTone(tone);
  }

  function handleCreateOrder() {
    const availableIncident = findIncidentToCreate(incidents, orders);
    if (!availableIncident) {
      setFeedback("No hay incidencias abiertas disponibles para crear nuevas ordenes.", "error");
      return;
    }

    try {
      const created = createWorkOrderFromIncident(availableIncident, {
        role: "ENCARGADO_MANTENIMIENTO",
        name: "Encargado Mantenimiento",
      });
      refreshLocalState();
      setSelectedOrderId(String(created.id));
      setFeedback(`Orden ${created.code} creada correctamente.`, "success");
    } catch (error) {
      setFeedback(error && error.message ? error.message : "No se pudo crear la orden.", "error");
    }
  }

  function handleExportOrders() {
    const csv = buildOrdersCsv(filteredOrders);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = `ordenes_trabajo_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(blobUrl);
    setFeedback("Exportacion CSV lista para abrir en Excel.", "success");
  }

  return (
    <main className="route-content orders-route-v2">
      <section className="orders-toolbar-v2">
        <div className="orders-toolbar-actions-v2">
          <button type="button" className="small-btn primary orders-cta-btn-v2" onClick={handleCreateOrder}>
            <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
              <path d="M12 5v14M5 12h14"></path>
            </svg>
            Nueva orden
          </button>
          <button type="button" className="small-btn orders-outline-btn-v2" onClick={handleExportOrders}>
            <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
              <path d="M12 4v11"></path>
              <path d="M8 10l4 4 4-4"></path>
              <path d="M5 18h14"></path>
            </svg>
            Exportar
          </button>
          <p className={`form-message ${actionTone}`}>{actionMessage}</p>
          {loadError ? <p className="module-inline-alert">{loadError}</p> : null}
        </div>

        <div className="orders-toolbar-filters-v2">
          <label className="orders-select-wrap-v2">
            <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
              <path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11z"></path>
              <circle cx="12" cy="10" r="2.7"></circle>
            </svg>
            <select value={regionalFilter} onChange={(event) => setRegionalFilter(event.target.value)}>
              <option value="">Regional</option>
              <option value="N/D">N/D</option>
            </select>
          </label>

          <label className="orders-select-wrap-v2">
            <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
              <path d="M4 7h16"></path>
              <path d="M4 12h16"></path>
              <path d="M4 17h16"></path>
            </svg>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="">Estado</option>
              <option value="assigned">Asignada</option>
              <option value="review">En revision</option>
              <option value="repair">En reparacion</option>
              <option value="closed">Cerrada</option>
            </select>
          </label>

          <label className="orders-select-wrap-v2">
            <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
              <path d="M5 5h14v4H5z"></path>
              <path d="M5 15h14v4H5z"></path>
              <path d="M12 9v6"></path>
            </svg>
            <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}>
              <option value="">Prioridad</option>
              <option value="alta">Alta</option>
              <option value="media">Media</option>
              <option value="baja">Baja</option>
            </select>
          </label>

          <label className="orders-select-wrap-v2">
            <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
              <circle cx="12" cy="8" r="3.1"></circle>
              <path d="M5 19.2c1.3-3.1 4-4.9 7-4.9s5.7 1.8 7 4.9"></path>
            </svg>
            <select value={mechanicFilter} onChange={(event) => setMechanicFilter(event.target.value)}>
              <option value="">Mecanico</option>
              {mechanics.map((mechanic) => (
                <option key={mechanic.id} value={String(mechanic.id)}>
                  {mechanic.fullName}
                </option>
              ))}
            </select>
          </label>

          <label className="orders-search-wrap-v2" htmlFor="workOrderSearch">
            <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
              <circle cx="11" cy="11" r="7"></circle>
              <path d="M20 20l-3.5-3.5"></path>
            </svg>
            <input
              id="workOrderSearch"
              type="search"
              placeholder="Buscar por orden, bus o mecanico"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </label>
        </div>
      </section>

      <section className="orders-kpi-grid-v2">
        <article className="panel orders-kpi-card-v2">
          <span className="orders-kpi-icon-v2 tone-blue" aria-hidden="true">
            <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
              <rect x="5" y="4" width="14" height="16" rx="2"></rect>
              <path d="M8 9h8M8 13h8M8 17h5"></path>
            </svg>
          </span>
          <div className="orders-kpi-copy-v2">
            <p>Ordenes abiertas</p>
            <strong>{dashboardMetrics.openOrders}</strong>
            <small>Seguimiento activo</small>
          </div>
        </article>

        <article className="panel orders-kpi-card-v2">
          <span className="orders-kpi-icon-v2 tone-blue" aria-hidden="true">
            <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
              <path d="M7.5 8.2l8.3 8.3"></path>
              <path d="M13.9 4.4a2.5 2.5 0 0 1 3.5 3.5l-2 2-3.5-3.5z"></path>
              <path d="M6.6 11.3L4.5 13.4a2.5 2.5 0 0 0 3.5 3.5l2.1-2.1"></path>
            </svg>
          </span>
          <div className="orders-kpi-copy-v2">
            <p>En proceso</p>
            <strong>{dashboardMetrics.inProgress}</strong>
            <small>Diagnostico y reparacion</small>
          </div>
        </article>

        <article className="panel orders-kpi-card-v2">
          <span className="orders-kpi-icon-v2 tone-gold" aria-hidden="true">
            <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
              <circle cx="12" cy="12" r="8"></circle>
              <path d="M8.5 12.2l2.3 2.3 4.7-4.7"></path>
            </svg>
          </span>
          <div className="orders-kpi-copy-v2">
            <p>Listas para revision</p>
            <strong>{dashboardMetrics.readyForReview}</strong>
            <small>Pendientes de aprobacion</small>
          </div>
        </article>

        <article className="panel orders-kpi-card-v2">
          <span className="orders-kpi-icon-v2 tone-green" aria-hidden="true">
            <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
              <circle cx="12" cy="12" r="8"></circle>
              <path d="M8.5 12.2l2.3 2.3 4.7-4.7"></path>
            </svg>
          </span>
          <div className="orders-kpi-copy-v2">
            <p>Cerradas este mes</p>
            <strong>{dashboardMetrics.closedThisMonth}</strong>
            <small>Control mensual</small>
          </div>
        </article>
      </section>

      <section className="orders-main-grid-v2">
        <section className="panel orders-list-card-v2">
          <div className="orders-card-header-v2">
            <h2>Listado de ordenes</h2>
          </div>

          <div className="table-wrap orders-table-wrap-v2">
            <table className="orders-table-v2">
              <thead>
                <tr>
                  <th>N° Orden</th>
                  <th>Bus</th>
                  <th>Tipo de trabajo</th>
                  <th>Mecanico</th>
                  <th>Prioridad</th>
                  <th>Estado</th>
                  <th>Inicio</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan="8">Cargando ordenes...</td>
                  </tr>
                ) : null}

                {!isLoading && paginatedOrders.length === 0 ? (
                  <tr>
                    <td colSpan="8">No hay ordenes para mostrar.</td>
                  </tr>
                ) : null}

                {!isLoading
                  ? paginatedOrders.map((order) => (
                      <tr
                        key={order.id}
                        className={String(order.id) === String(selectedOrderId) ? "table-row-selected" : ""}
                      >
                        <td>
                          <button
                            type="button"
                            className="table-link-btn orders-row-link-v2"
                            onClick={() => setSelectedOrderId(String(order.id))}
                          >
                            {order.code}
                          </button>
                        </td>
                        <td>{order.busLabel}</td>
                        <td>{order.workType}</td>
                        <td>{order.assignedMechanicName}</td>
                        <td>
                          <span className={`orders-priority-pill-v2 ${order.priorityClass}`}>
                            {order.priorityLabel}
                          </span>
                        </td>
                        <td>
                          <span className={`orders-status-pill-v2 ${order.statusClass}`}>{order.statusLabel}</span>
                        </td>
                        <td>{order.startLabel}</td>
                        <td>
                          <button
                            type="button"
                            className="orders-row-action-v2"
                            aria-label={`Acciones para ${order.code}`}
                          >
                            <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
                              <circle cx="12" cy="6.5" r="1.4"></circle>
                              <circle cx="12" cy="12" r="1.4"></circle>
                              <circle cx="12" cy="17.5" r="1.4"></circle>
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))
                  : null}
              </tbody>
            </table>
          </div>

          <div className="orders-pagination-v2">
            <p className="table-pagination-meta">
              Mostrando {pageStart} a {pageEnd} de {filteredOrders.length} ordenes
            </p>

            <div className="orders-pagination-controls-v2">
              <button
                className="orders-page-arrow-v2"
                type="button"
                onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                disabled={safePage <= 1}
                aria-label="Pagina anterior"
              >
                <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
                  <path d="M14.5 7.5L10 12l4.5 4.5"></path>
                </svg>
              </button>

              {Array.from({ length: Math.min(totalPages, 5) }).map((_, index) => {
                const pageNumber = index + 1;
                return (
                  <button
                    key={pageNumber}
                    className={`orders-page-number-v2 ${safePage === pageNumber ? "active" : ""}`}
                    type="button"
                    onClick={() => setPage(pageNumber)}
                  >
                    {pageNumber}
                  </button>
                );
              })}

              <button
                className="orders-page-arrow-v2"
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

          {pendingApprovalCount > 0 ? (
            <div className="orders-alert-banner-v2">
              <span className="orders-alert-icon-v2" aria-hidden="true">
                <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
                  <path d="M12 4l9 16H3z"></path>
                  <path d="M12 9v4"></path>
                  <circle cx="12" cy="16.5" r="0.8"></circle>
                </svg>
              </span>
              <p>Tienes {pendingApprovalCount} ordenes listas para aprobacion de mantenimiento y operaciones.</p>
              <button type="button">Ver ahora</button>
            </div>
          ) : null}
        </section>

        <aside className="orders-side-stack-v2">
          <section className="panel orders-status-card-v2">
            <div className="orders-card-header-v2">
              <h2>Estado de ordenes</h2>
            </div>

            <div className="orders-status-body-v2">
              <div className="orders-status-donut-v2" style={buildOrdersDonutStyle(orderStatusSummary)}>
                <div className="orders-status-center-v2">
                  <span>Total</span>
                  <strong>{orderStatusSummary.total}</strong>
                  <small>ordenes</small>
                </div>
              </div>

              <ul className="orders-status-legend-v2">
                <li>
                  <span className="dot assigned"></span>
                  Asignadas
                  <strong>{orderStatusSummary.assigned}</strong>
                </li>
                <li>
                  <span className="dot review"></span>
                  En revision
                  <strong>{orderStatusSummary.review}</strong>
                </li>
                <li>
                  <span className="dot repair"></span>
                  En reparacion
                  <strong>{orderStatusSummary.repair}</strong>
                </li>
                <li>
                  <span className="dot closed"></span>
                  Cerradas
                  <strong>{orderStatusSummary.closed}</strong>
                </li>
              </ul>
            </div>
          </section>

          <section className="panel orders-detail-card-v2">
            <div className="orders-card-header-v2">
              <h2>Detalle de orden</h2>
            </div>

            {!selectedOrder ? <p className="module-description">Selecciona una orden para ver el detalle.</p> : null}

            {selectedOrder ? (
              <div className="orders-detail-body-v2">
                <div className="orders-detail-hero-v2">
                  <div className="orders-detail-icon-v2" aria-hidden="true">
                    <svg viewBox="0 0 120 120" role="img" aria-hidden="true">
                      <rect x="16" y="14" width="62" height="92" rx="8"></rect>
                      <rect x="40" y="8" width="16" height="10" rx="3"></rect>
                      <path d="M30 42h34M30 56h34M30 70h24"></path>
                      <circle cx="30" cy="42" r="2"></circle>
                      <circle cx="30" cy="56" r="2"></circle>
                      <circle cx="30" cy="70" r="2"></circle>
                      <path d="M70 82l23-23 9 9-23 23h-9z"></path>
                      <circle cx="66" cy="86" r="7"></circle>
                    </svg>
                  </div>

                  <dl className="orders-detail-grid-v2">
                    <div>
                      <dt>N° Orden:</dt>
                      <dd>{selectedOrder.code}</dd>
                    </div>
                    <div>
                      <dt>Bus:</dt>
                      <dd>{selectedOrder.busLabel}</dd>
                    </div>
                    <div>
                      <dt>Tipo:</dt>
                      <dd>{selectedOrder.workType}</dd>
                    </div>
                    <div>
                      <dt>Mecanico:</dt>
                      <dd>{selectedOrder.assignedMechanicName}</dd>
                    </div>
                    <div>
                      <dt>Prioridad:</dt>
                      <dd>{selectedOrder.priorityLabel}</dd>
                    </div>
                    <div>
                      <dt>Estado:</dt>
                      <dd>{selectedOrder.statusLabel}</dd>
                    </div>
                    <div>
                      <dt>Fecha inicio:</dt>
                      <dd>{selectedOrder.startLabel}</dd>
                    </div>
                    <div>
                      <dt>Incidencia relacionada:</dt>
                      <dd>{selectedOrder.incidentCode}</dd>
                    </div>
                  </dl>
                </div>

                <div className="orders-detail-extra-v2">
                  <p>
                    <strong>Diagnostico breve:</strong> {selectedOrder.diagnosis || "Sin diagnostico registrado"}
                  </p>
                  <p>
                    <strong>Tareas internas:</strong> {selectedOrder.tasksCount} registradas
                  </p>
                  <p>
                    <strong>Evidencias:</strong> {selectedOrder.evidencesCount} fotos adjuntas
                  </p>
                </div>

                <button type="button" className="small-btn orders-full-record-btn-v2">
                  Ver orden completa
                </button>
              </div>
            ) : null}
          </section>
        </aside>
      </section>
    </main>
  );
}

function mapOrderPresentation(order, incidentsById) {
  const incident = incidentsById.get(Number(order.incidentId)) || null;
  const workType = resolveWorkType(order, incident);
  const priorityLabel = resolvePriority(order, incident);
  const priorityBucket = mapPriorityBucket(priorityLabel);

  return {
    ...order,
    workType,
    priorityLabel,
    priorityBucket,
    priorityClass: `tone-${priorityBucket}`,
    statusClass: mapOrderStatusClass(order.statusCode),
    statusBucket: mapOrderStatusBucket(order.statusCode),
    regional: "N/D",
    startLabel: formatOrderStart(order.createdAt),
    diagnosis: String(order.diagnosis || "").trim(),
    tasksCount: Array.isArray(order.tasks) ? order.tasks.length : 0,
    evidencesCount: Array.isArray(order.evidences) ? order.evidences.length : 0,
  };
}

function resolveWorkType(order, incident) {
  const incidentType = incident && incident.typeLabel ? String(incident.typeLabel).trim() : "";
  if (incidentType) {
    return incidentType;
  }

  const diagnosis = String(order && order.diagnosis ? order.diagnosis : "").trim();
  if (diagnosis) {
    return diagnosis.length > 32 ? `${diagnosis.slice(0, 32)}...` : diagnosis;
  }

  return "Revision general";
}

function resolvePriority(order, incident) {
  const priority = String(order && order.priorityLabel ? order.priorityLabel : "").trim();
  if (priority) {
    return priority;
  }

  const incidentPriority = incident && incident.priorityLabel ? String(incident.priorityLabel).trim() : "";
  return incidentPriority || "Media";
}

function mapPriorityBucket(priorityLabel) {
  const comparable = String(priorityLabel || "").toLowerCase();
  if (comparable.includes("alta") || comparable.includes("crit")) {
    return "alta";
  }
  if (comparable.includes("baja")) {
    return "baja";
  }
  return "media";
}

function mapOrderStatusClass(statusCode) {
  if (statusCode === "CERRADA" || statusCode === "APROBADA_OPERACIONES") {
    return "closed";
  }
  if (statusCode === "EN_REPARACION" || statusCode === "EN_ESPERA_REPUESTOS") {
    return "repair";
  }
  if (statusCode === "LISTA_REVISION" || statusCode === "APROBADA_MANTENIMIENTO") {
    return "review";
  }
  return "assigned";
}

function mapOrderStatusBucket(statusCode) {
  if (["CERRADA", "RECHAZADA", "ANULADA", "APROBADA_OPERACIONES"].includes(statusCode)) {
    return "closed";
  }
  if (["EN_REPARACION", "EN_ESPERA_REPUESTOS"].includes(statusCode)) {
    return "repair";
  }
  if (["LISTA_REVISION", "APROBADA_MANTENIMIENTO", "EN_DIAGNOSTICO"].includes(statusCode)) {
    return "review";
  }
  return "assigned";
}

function formatOrderStart(value) {
  if (!value) {
    return "N/D";
  }

  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) {
    return "N/D";
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const parsedStart = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()).getTime();
  const diffDays = Math.floor((todayStart - parsedStart) / (1000 * 60 * 60 * 24));

  const timeLabel = parsed.toLocaleTimeString("es-DO", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (diffDays === 0) {
    return `Hoy, ${timeLabel}`;
  }
  if (diffDays === 1) {
    return `Ayer, ${timeLabel}`;
  }
  return parsed.toLocaleDateString("es-DO");
}

function isDateInCurrentMonth(value) {
  if (!value) {
    return false;
  }
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) {
    return false;
  }

  const now = new Date();
  return parsed.getFullYear() === now.getFullYear() && parsed.getMonth() === now.getMonth();
}

function resolvePercent(value, total) {
  if (!total) {
    return 0;
  }
  return Math.round((Number(value || 0) / Number(total)) * 100);
}

function buildOrdersDonutStyle(summary) {
  const assignedEnd = summary.assignedPercent;
  const reviewEnd = assignedEnd + summary.reviewPercent;
  const repairEnd = reviewEnd + summary.repairPercent;

  return {
    background: `conic-gradient(
      #3b7be0 0 ${assignedEnd}%,
      #f3ae24 ${assignedEnd}% ${reviewEnd}%,
      #e04c46 ${reviewEnd}% ${repairEnd}%,
      #3eb96f ${repairEnd}% 100%
    )`,
  };
}

function findIncidentToCreate(incidents, orders) {
  const openIncidents = (incidents || []).filter((incident) => incident && !incident.closedAt);

  return openIncidents.find((incident) => {
    return !(orders || []).some(
      (order) => Number(order.incidentId) === Number(incident.id) && !TERMINAL_STATUS.has(order.statusCode)
    );
  });
}

function buildOrdersCsv(rows) {
  const headers = [
    "orden",
    "incidencia",
    "bus",
    "tipo_trabajo",
    "mecanico",
    "prioridad",
    "estado",
    "fecha_inicio",
  ];

  const lines = [headers.join(",")];
  (rows || []).forEach((row) => {
    lines.push(
      [
        row.code,
        row.incidentCode,
        row.busLabel,
        row.workType,
        row.assignedMechanicName,
        row.priorityLabel,
        row.statusLabel,
        row.startLabel,
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
