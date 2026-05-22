import { memo } from "react";
import { NavLink } from "react-router-dom";

function Navigation({ items, onNavigate }) {
  return (
    <nav className="main-nav" aria-label="Navegacion principal">
      {items.map((item) => {
        if (!item.path) {
          return (
            <span key={item.id} className="nav-item nav-item-static" aria-disabled="true">
              <span className="nav-item-icon" aria-hidden="true">
                <NavIcon id={item.id} />
              </span>
              {item.label}
            </span>
          );
        }

        return (
          <NavLink
            key={item.id}
            to={item.path}
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
            onClick={onNavigate}
          >
            <span className="nav-item-icon" aria-hidden="true">
              <NavIcon id={item.id} />
            </span>
            {item.label}
          </NavLink>
        );
      })}
    </nav>
  );
}

function NavIcon({ id }) {
  if (id === "dashboard") {
    return (
      <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
        <rect x="3.5" y="3.5" width="7.5" height="7.5" rx="1.5"></rect>
        <rect x="13" y="3.5" width="7.5" height="7.5" rx="1.5"></rect>
        <rect x="3.5" y="13" width="7.5" height="7.5" rx="1.5"></rect>
        <rect x="13" y="13" width="7.5" height="7.5" rx="1.5"></rect>
      </svg>
    );
  }

  if (id === "buses") {
    return (
      <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
        <path d="M6 16h12"></path>
        <path d="M5 16V9a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v7"></path>
        <circle cx="8" cy="18" r="1.5"></circle>
        <circle cx="16" cy="18" r="1.5"></circle>
      </svg>
    );
  }

  if (id === "incidencias") {
    return (
      <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
        <path d="M12 4l9 16H3z"></path>
        <path d="M12 9v4"></path>
        <circle cx="12" cy="16.5" r="0.8"></circle>
      </svg>
    );
  }

  if (id === "ordenes") {
    return (
      <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
        <rect x="5" y="4" width="14" height="16" rx="2"></rect>
        <path d="M8 9h8M8 13h8M8 17h5"></path>
      </svg>
    );
  }

  if (id === "mantenimiento") {
    return (
      <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
        <path d="M14.8 6.2a3.2 3.2 0 0 0 0 4.5l-5.1 5.1a2 2 0 0 1-2.8 0l-.6-.6a2 2 0 0 1 0-2.8l5.1-5.1a3.2 3.2 0 1 0 3.4-1.1z"></path>
      </svg>
    );
  }

  if (id === "reportes") {
    return (
      <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
        <path d="M5 20V10"></path>
        <path d="M11 20V4"></path>
        <path d="M17 20v-7"></path>
      </svg>
    );
  }

  if (id === "documentos") {
    return (
      <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
        <path d="M7 3.8h7l4 4v12.4a1.8 1.8 0 0 1-1.8 1.8H7a1.8 1.8 0 0 1-1.8-1.8V5.6A1.8 1.8 0 0 1 7 3.8z"></path>
        <path d="M14 3.8v4.1h4"></path>
        <path d="M8.4 13h7.2M8.4 16.2h7.2"></path>
      </svg>
    );
  }

  if (id === "configuracion") {
    return (
      <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
        <circle cx="12" cy="12" r="2.6"></circle>
        <path d="M19.6 13.2v-2.4l-1.9-.6a5.9 5.9 0 0 0-.6-1.3l.9-1.8-1.7-1.7-1.8.9a5.9 5.9 0 0 0-1.3-.6l-.6-1.9h-2.4l-.6 1.9a5.9 5.9 0 0 0-1.3.6l-1.8-.9-1.7 1.7.9 1.8a5.9 5.9 0 0 0-.6 1.3l-1.9.6v2.4l1.9.6a5.9 5.9 0 0 0 .6 1.3l-.9 1.8 1.7 1.7 1.8-.9a5.9 5.9 0 0 0 1.3.6l.6 1.9h2.4l.6-1.9a5.9 5.9 0 0 0 1.3-.6l1.8.9 1.7-1.7-.9-1.8a5.9 5.9 0 0 0 .6-1.3z"></path>
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
      <circle cx="12" cy="12" r="5"></circle>
    </svg>
  );
}

export default memo(Navigation);
