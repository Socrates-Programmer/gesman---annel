import { memo } from "react";

function DashboardPanel({ metrics, typeDistribution, recentIncidents, isLoading, errorMessage }) {
  const hasTypeData = Array.isArray(typeDistribution) && typeDistribution.length > 0;
  const hasRecentIncidents = Array.isArray(recentIncidents) && recentIncidents.length > 0;
  const totalTypeValue = (typeDistribution || []).reduce((acc, item) => acc + (Number(item.value) || 0), 0);

  return (
    <section className="dashboard-panel">
      <div className="metric-grid dashboard-metric-grid">
        {metrics.map((metric) => (
          <article key={metric.id} className={`metric-card-pro tone-${resolveMetricTone(metric.id)}`}>
            <div className="metric-icon" aria-hidden="true">
              {resolveMetricIcon(metric.id)}
            </div>
            <div>
              <p>{metric.title}</p>
              <strong>{metric.value}</strong>
              <span>{resolveMetricCaption(metric.id)}</span>
            </div>
          </article>
        ))}
      </div>

      <div className="dashboard-bottom-layout">
        <article className="panel module-panel">
          <h2>Tipos de Incidencias</h2>
          {isLoading ? <p>Cargando distribucion...</p> : null}
          {errorMessage ? <p className="module-inline-alert">{errorMessage}</p> : null}
          {!isLoading && !errorMessage ? (
            <div className="dashboard-types-layout">
              <div className="dashboard-donut-wrap">
                <div className="dashboard-donut">
                  <strong>{totalTypeValue || 0}</strong>
                  <span>Total</span>
                </div>
              </div>
              <ul className="legend-list dashboard-legend">
                {hasTypeData ? (
                  typeDistribution.map((item, index) => (
                    <li key={item.id || item.label}>
                      <span className={`legend-dot ${resolveLegendClass(index)}`}></span>
                      {item.label}
                      <strong>{resolvePercent(item.value, totalTypeValue)}</strong>
                    </li>
                  ))
                ) : (
                  <li>Sin datos de tipos para mostrar.</li>
                )}
              </ul>
            </div>
          ) : null}
        </article>

        <article className="panel module-panel">
          <div className="dashboard-recent-header">
            <h2>Incidencias Recientes</h2>
            <button className="small-btn" type="button">
              Ver todas
            </button>
          </div>
          {isLoading ? <p>Cargando incidencias recientes...</p> : null}
          {errorMessage ? <p className="module-inline-alert">{errorMessage}</p> : null}
          {!isLoading && !errorMessage ? (
            <ul className="recent-list-pro">
              {hasRecentIncidents ? (
                recentIncidents.map((incident, index) => (
                  <li key={incident.id || `${incident.code}-${index}`}>
                    <span className={`legend-dot ${resolveLegendClass(index)}`}></span>
                    <div>
                      <p>
                        {incident.code} {incident.description || "Sin descripcion"} <strong>{incident.vehicleLabel}</strong>
                      </p>
                      <small>Tipo: {incident.typeLabel || "N/A"}</small>
                    </div>
                    <time>{resolveIncidentTime(incident.createdAt)}</time>
                  </li>
                ))
              ) : (
                <li>Sin incidencias recientes.</li>
              )}
            </ul>
          ) : null}
        </article>
      </div>
    </section>
  );
}

function resolveMetricIcon(metricId) {
  const map = {
    open: "!",
    closed: "O",
    active: "V",
    inactive: "I",
    total: "T",
  };
  return map[metricId] || "M";
}

function resolveMetricCaption(metricId) {
  const map = {
    open: "Requieren atencion",
    closed: "Resueltas",
    active: "En operacion",
    inactive: "Fuera de operacion",
    total: "Registrados",
  };
  return map[metricId] || "";
}

function resolveMetricTone(metricId) {
  const map = {
    open: "gold",
    closed: "green",
    active: "blue",
    inactive: "red",
    total: "violet",
  };
  return map[metricId] || "blue";
}

function resolvePercent(value, total) {
  const safeTotal = total || 0;
  if (!safeTotal) {
    return "0%";
  }
  return `${Math.round(((Number(value) || 0) / safeTotal) * 100)}% (${Number(value) || 0})`;
}

function resolveIncidentTime(createdAt) {
  if (!createdAt) {
    return "";
  }
  const parsedDate = new Date(createdAt);
  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }
  return parsedDate.toLocaleTimeString("es-DO", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function resolveLegendClass(index) {
  const classes = ["dot-blue", "dot-orange", "dot-gold", "dot-slate"];
  return classes[index % classes.length];
}

export default memo(DashboardPanel);
