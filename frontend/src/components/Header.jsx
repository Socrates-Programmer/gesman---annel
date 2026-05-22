import { memo } from "react";
import { useLocation } from "react-router-dom";

function Header({ onLogout, username, onToggleMenu, isSidebarOpen }) {
  const location = useLocation();
  const currentModule = resolveCurrentModule(location.pathname);
  const displayName = username && String(username).trim() ? String(username).trim() : "";
  const initials = resolveUserInitials(displayName);

  return (
    <header className="top-header">
      <div className="top-header-title-wrap">
        <button
          type="button"
          className="top-header-menu-btn"
          aria-label="Menu"
          aria-controls="app-sidebar"
          aria-expanded={Boolean(isSidebarOpen)}
          onClick={onToggleMenu}
        >
          <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
            <path d="M4 6.5h16M4 12h16M4 17.5h16" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"></path>
          </svg>
        </button>
        <div className="top-header-title-group">
          <h1>{currentModule.title}</h1>
        </div>
      </div>

      <div className="top-header-search-wrap">
        <label className="top-header-search" htmlFor="globalSearch">
          <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
            <circle cx="11" cy="11" r="7"></circle>
            <path d="M20 20l-3.5-3.5"></path>
          </svg>
          <input id="globalSearch" type="search" placeholder="Buscar buses, incidencias, ordenes..." />
        </label>
      </div>

      <div className="top-header-actions">
        <button type="button" className="top-header-notification" aria-label="Notificaciones">
          <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
            <path d="M15 17h5l-1.3-1.3a2 2 0 0 1-.6-1.4V11a6 6 0 1 0-12 0v3.3a2 2 0 0 1-.6 1.4L4 17h5"></path>
            <path d="M9.5 17a2.5 2.5 0 0 0 5 0"></path>
          </svg>
          <span className="top-header-notification-badge">3</span>
        </button>

        <div className="top-header-user-card">
          <span className="top-header-user-avatar">{initials}</span>
          <div className="top-header-user-meta">
            <strong>{displayName || "Usuario Interno"}</strong>
            <span>{resolveRoleLabel(displayName)}</span>
          </div>
          {typeof onLogout === "function" ? (
            <button className="top-header-logout-link" type="button" onClick={onLogout}>
              Salir
            </button>
          ) : null}
        </div>

      </div>
    </header>
  );
}

function resolveCurrentModule(pathname) {
  const map = [
    { match: "/dashboard", title: "Dashboard de Mantenimiento" },
    { match: "/reportar-incidencia", title: "Registro de Incidencia" },
    { match: "/incidencias", title: "Incidencias" },
    { match: "/ordenes-trabajo", title: "Ordenes de trabajo" },
    { match: "/vehiculo", title: "Buses" },
    { match: "/mantenimiento", title: "Gestion de Mantenimiento" },
    { match: "/reportes", title: "Gestion de Reportes" },
  ];

  const current = map.find((item) => pathname.startsWith(item.match));
  return current || { title: "Dashboard de Mantenimiento" };
}

function resolveUserInitials(displayName) {
  const normalized = String(displayName || "").trim();
  if (!normalized) {
    return "US";
  }

  const parts = normalized.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
}

function resolveRoleLabel(displayName) {
  const value = String(displayName || "").toLowerCase();
  if (value.includes("admin")) {
    return "Administrador";
  }
  if (value.includes("supervisor")) {
    return "Supervisor";
  }
  return "Usuario interno";
}

export default memo(Header);
