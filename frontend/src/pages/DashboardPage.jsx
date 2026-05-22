import { useEffect, useMemo, useState } from "react";
import { fetchDashboardSummary } from "../data/dashboardApi";

const DEFAULT_SUMMARY = {
  metrics: {
    openIncidents: 0,
    closedIncidents: 0,
    activeVehicles: 0,
    inactiveVehicles: 0,
    totalVehicles: 0,
  },
  statusDistribution: [],
  typeDistribution: [],
  recentIncidents: [],
};

export default function DashboardPage() {
  const [summary, setSummary] = useState(DEFAULT_SUMMARY);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadSummary() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const payload = await fetchDashboardSummary();
        if (isMounted) {
          setSummary(payload || DEFAULT_SUMMARY);
        }
      } catch (error) {
        if (isMounted) {
          setSummary(DEFAULT_SUMMARY);
          setErrorMessage(error && error.message ? error.message : "No se pudo cargar el dashboard.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadSummary();

    return () => {
      isMounted = false;
    };
  }, []);

  const metrics = summary && summary.metrics ? summary.metrics : DEFAULT_SUMMARY.metrics;
  const activeVehicles = Number(metrics.activeVehicles) || 0;
  const inactiveVehicles = Number(metrics.inactiveVehicles) || 0;
  const totalVehicles = Number(metrics.totalVehicles) || activeVehicles + inactiveVehicles;
  const openIncidents = Number(metrics.openIncidents) || 0;

  const maintenanceVehicles = useMemo(() => {
    const statusRows = Array.isArray(summary.statusDistribution) ? summary.statusDistribution : [];
    const totalFromMaintenance = statusRows
      .filter((item) => normalizeComparableText(item.label).includes("MANTEN"))
      .reduce((accumulator, item) => accumulator + (Number(item.value) || 0), 0);
    return Math.max(0, totalFromMaintenance);
  }, [summary.statusDistribution]);

  const fleetTotal = Math.max(totalVehicles, activeVehicles + inactiveVehicles + maintenanceVehicles);

  const kpiCards = [
    {
      id: "active",
      title: "Buses operativos",
      value: activeVehicles,
      trend: "+8",
      trendTone: "success",
      icon: "bus",
    },
    {
      id: "inactive",
      title: "Fuera de servicio",
      value: inactiveVehicles,
      trend: "+2",
      trendTone: "danger",
      icon: "bus-off",
    },
    {
      id: "incidents",
      title: "Incidencias abiertas",
      value: openIncidents,
      trend: "+5",
      trendTone: "warning",
      icon: "alert",
    },
    {
      id: "maintenance",
      title: "Mantenimientos proximos",
      value: maintenanceVehicles || (summary.recentIncidents || []).length,
      trend: "+3",
      trendTone: "info",
      icon: "calendar",
    },
  ];

  const recentOrders = useMemo(() => {
    const source = Array.isArray(summary.recentIncidents) ? summary.recentIncidents : [];
    return source.slice(0, 5).map((item, index) => ({
      orderCode: `OT-2026-${String(1580 + index).padStart(4, "0")}`,
      bus: item.vehicleLabel || "Bus N/A",
      type: item.typeLabel || "Revision general",
      status: resolveVisualStatus(item.statusLabel),
      priority: item.priorityLabel || "Media",
      updatedAt: formatTimeAgo(item.createdAt),
    }));
  }, [summary.recentIncidents]);

  const upcomingMaintenance = useMemo(() => {
    const source = Array.isArray(summary.recentIncidents) ? summary.recentIncidents : [];
    return source.slice(0, 3).map((item, index) => ({
      id: item.id || index,
      bus: item.vehicleLabel || `Bus ${1000 + index}`,
      task: item.typeLabel || "Revision preventiva",
      date: calculateFutureDate(index + 2),
      km: `${45 + index * 5}.000 km`,
    }));
  }, [summary.recentIncidents]);

  const fleetPercentages = useMemo(() => {
    const safeTotal = Math.max(fleetTotal, 1);
    const operativePercent = Math.round((activeVehicles / safeTotal) * 100);
    const maintenancePercent = Math.round((maintenanceVehicles / safeTotal) * 100);
    const outPercent = Math.max(0, 100 - operativePercent - maintenancePercent);
    return {
      operativePercent,
      maintenancePercent,
      outPercent,
    };
  }, [fleetTotal, activeVehicles, maintenanceVehicles]);

  const donutStyle = useMemo(() => {
    const p1 = fleetPercentages.operativePercent;
    const p2 = p1 + fleetPercentages.maintenancePercent;
    return {
      background: `conic-gradient(#4a9f67 0 ${p1}%, #d4a631 ${p1}% ${p2}%, #b56256 ${p2}% 100%)`,
    };
  }, [fleetPercentages]);

  return (
    <main className="dashboard-route dashboard-route-v2">
      {errorMessage ? <p className="module-inline-alert">{errorMessage}</p> : null}

      <section className="panel maintenance-critical-alert">
        <div className="maintenance-critical-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
            <path d="M12 3l9 16H3z"></path>
            <path d="M12 9v4"></path>
            <circle cx="12" cy="17" r="1"></circle>
          </svg>
        </div>
        <div className="maintenance-critical-copy">
          <strong>Bus fuera de servicio - revisar incidencia critica</strong>
          <span>Bus 1027 - Falla en sistema de frenos reportada hoy 08:15.</span>
        </div>
        <button type="button" className="small-btn maintenance-critical-btn">
          Ver incidencia
        </button>
      </section>

      <section className="dashboard-filter-row">
        <label className="dashboard-filter-control">
          <span>Regional</span>
          <select>
            <option>Todas</option>
            <option>Norte</option>
            <option>Sur</option>
            <option>Este</option>
          </select>
        </label>
        <label className="dashboard-filter-control">
          <span>Prioridad</span>
          <select>
            <option>Todas</option>
            <option>Alta</option>
            <option>Media</option>
            <option>Baja</option>
          </select>
        </label>
        <label className="dashboard-filter-control">
          <span>Estado</span>
          <select>
            <option>Todos</option>
            <option>Operativo</option>
            <option>En reparacion</option>
            <option>Fuera de servicio</option>
          </select>
        </label>
        <button type="button" className="dashboard-filter-date-btn">
          Rango de fechas
        </button>
      </section>

      <section className="dashboard-kpi-grid">
        {kpiCards.map((card) => (
          <article key={card.id} className="panel dashboard-kpi-card">
            <div className={`dashboard-kpi-icon tone-${card.id}`}>{renderKpiIcon(card.icon)}</div>
            <div>
              <p>{card.title}</p>
              <strong>{card.value}</strong>
              <span className={`dashboard-kpi-trend ${card.trendTone}`}>
                {card.trend} vs. semana anterior
              </span>
            </div>
          </article>
        ))}
      </section>

      <section className="dashboard-main-grid-v2">
        <article className="panel dashboard-orders-card">
          <div className="dashboard-card-header">
            <h2>Ordenes recientes</h2>
            <button type="button" className="small-btn">
              Ver todas
            </button>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>N Orden</th>
                  <th>Bus</th>
                  <th>Tipo de trabajo</th>
                  <th>Estado</th>
                  <th>Prioridad</th>
                  <th>Actualizado</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan="6">Cargando ordenes...</td>
                  </tr>
                ) : null}

                {!isLoading && recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan="6">No hay ordenes para mostrar.</td>
                  </tr>
                ) : null}

                {!isLoading
                  ? recentOrders.map((row) => (
                      <tr key={row.orderCode}>
                        <td>{row.orderCode}</td>
                        <td>{row.bus}</td>
                        <td>{row.type}</td>
                        <td>
                          <span className={`status-pill ${row.status.statusClass}`}>{row.status.label}</span>
                        </td>
                        <td>
                          <span className={`dashboard-priority-dot ${row.priority.toLowerCase()}`}></span>
                          {row.priority}
                        </td>
                        <td>{row.updatedAt}</td>
                      </tr>
                    ))
                  : null}
              </tbody>
            </table>
          </div>
        </article>

        <div className="dashboard-side-stack-v2">
          <article className="panel dashboard-fleet-card">
            <div className="dashboard-card-header">
              <h2>Estado de flota</h2>
            </div>
            <div className="fleet-card-body">
              <div className="fleet-donut" style={donutStyle}>
                <div className="fleet-donut-center">
                  <span>Total</span>
                  <strong>{fleetTotal}</strong>
                  <small>buses</small>
                </div>
              </div>
              <ul className="fleet-legend">
                <li>
                  <span className="dot success"></span>
                  Operativos
                  <strong>
                    {activeVehicles} ({fleetPercentages.operativePercent}%)
                  </strong>
                </li>
                <li>
                  <span className="dot warning"></span>
                  En mantenimiento
                  <strong>
                    {maintenanceVehicles} ({fleetPercentages.maintenancePercent}%)
                  </strong>
                </li>
                <li>
                  <span className="dot danger"></span>
                  Fuera de servicio
                  <strong>
                    {inactiveVehicles} ({fleetPercentages.outPercent}%)
                  </strong>
                </li>
              </ul>
            </div>
          </article>

          <article className="panel dashboard-upcoming-card">
            <div className="dashboard-card-header">
              <h2>Proximos mantenimientos</h2>
              <button type="button" className="small-btn">
                Ver todos
              </button>
            </div>
            <ul className="dashboard-upcoming-list">
              {isLoading ? <li>Cargando mantenimientos...</li> : null}
              {!isLoading && upcomingMaintenance.length === 0 ? <li>Sin mantenimientos proximos.</li> : null}
              {!isLoading
                ? upcomingMaintenance.map((item) => (
                    <li key={item.id}>
                      <div>
                        <strong>{item.bus}</strong>
                        <p>{item.task}</p>
                      </div>
                      <span>{item.date}</span>
                      <span>{item.km}</span>
                    </li>
                  ))
                : null}
            </ul>
          </article>
        </div>
      </section>
    </main>
  );
}

function renderKpiIcon(iconName) {
  if (iconName === "bus") {
    return (
      <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
        <path d="M5 16V8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v8"></path>
        <path d="M5 13h14"></path>
        <circle cx="8" cy="18" r="1.5"></circle>
        <circle cx="16" cy="18" r="1.5"></circle>
      </svg>
    );
  }

  if (iconName === "bus-off") {
    return (
      <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
        <path d="M4 4l16 16"></path>
        <path d="M7 7a2 2 0 0 1 1-.3h8a2 2 0 0 1 2 2v5"></path>
        <circle cx="8" cy="18" r="1.5"></circle>
        <circle cx="16" cy="18" r="1.5"></circle>
      </svg>
    );
  }

  if (iconName === "alert") {
    return (
      <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
        <path d="M12 3l9 16H3z"></path>
        <path d="M12 9v4"></path>
        <circle cx="12" cy="17" r="1"></circle>
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
      <rect x="4" y="5" width="16" height="15" rx="2"></rect>
      <path d="M8 3v4M16 3v4M4 10h16"></path>
    </svg>
  );
}

function resolveVisualStatus(statusLabel) {
  const normalized = normalizeComparableText(statusLabel);
  if (normalized.includes("REVISION")) {
    return {
      label: "En revision",
      statusClass: "progress",
    };
  }
  if (normalized.includes("REPARAC")) {
    return {
      label: "En reparacion",
      statusClass: "pending",
    };
  }
  if (normalized.includes("RESUEL") || normalized.includes("CERR")) {
    return {
      label: "Lista para revision",
      statusClass: "resolved",
    };
  }
  return {
    label: statusLabel || "En proceso",
    statusClass: "progress",
  };
}

function formatTimeAgo(value) {
  if (!value) {
    return "Hoy, 08:00";
  }
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) {
    return "Hoy, 08:00";
  }
  return parsed.toLocaleString("es-DO", {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function calculateFutureDate(daysFromNow) {
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + daysFromNow);
  return targetDate.toLocaleDateString("es-DO");
}

function normalizeComparableText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();
}
