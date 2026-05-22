import Header from "./components/Header";
import Navigation from "./components/Navigation";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { NAV_LINKS } from "./data/dashboardData";
import traeLogo from "./assets/Logo.png";
import DashboardPage from "./pages/DashboardPage";
import IncidentsPage from "./pages/IncidentsPage";
import LoginPage from "./pages/LoginPage";
import MaintenancePage from "./pages/MaintenancePage";
import ReportIncidentPage from "./pages/ReportIncidentPage";
import ReportsPage from "./pages/ReportsPage";
import VehiclePage from "./pages/VehiclePage";
import WorkOrdersPage from "./pages/WorkOrdersPage";
import { fetchSession, logout } from "./data/authApi";
import { useEffect, useMemo, useState } from "react";

function ProtectedLayout({ onLogout, username }) {
  const [isCompactLayout, setIsCompactLayout] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return window.matchMedia("(max-width: 1220px)").matches;
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window === "undefined") {
      return true;
    }
    return !window.matchMedia("(max-width: 1220px)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const mediaQuery = window.matchMedia("(max-width: 1220px)");
    const syncLayout = (event) => {
      const compact = event.matches;
      setIsCompactLayout(compact);
      setIsSidebarOpen(!compact);
    };

    syncLayout(mediaQuery);

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", syncLayout);
      return () => mediaQuery.removeEventListener("change", syncLayout);
    }

    mediaQuery.addListener(syncLayout);
    return () => mediaQuery.removeListener(syncLayout);
  }, []);

  function handleToggleSidebar() {
    setIsSidebarOpen((previousState) => !previousState);
  }

  function handleNavigationClick() {
    if (isCompactLayout) {
      setIsSidebarOpen(false);
    }
  }

  return (
    <div className={`app-shell ${isSidebarOpen ? "sidebar-open" : "sidebar-collapsed"}`}>
      {isCompactLayout && isSidebarOpen ? (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Cerrar menu lateral"
          onClick={handleToggleSidebar}
        ></button>
      ) : null}
      <aside id="app-sidebar" className="app-sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-mark">
            <img className="sidebar-brand-logo" src={traeLogo} alt="GMI Buses" />
            <div className="sidebar-brand-text">
              <strong>GMI BUSES</strong>
              <span>Gestor de Mantenimiento e Incidencias</span>
            </div>
          </div>
        </div>
        <Navigation items={NAV_LINKS} onNavigate={handleNavigationClick} />
        <div className="sidebar-lower">
          <button type="button" className="sidebar-collapse-btn" onClick={handleToggleSidebar}>
            <span className="sidebar-collapse-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
                <path d="M14.5 7.5L10 12l4.5 4.5"></path>
              </svg>
            </span>
            Colapsar
          </button>
          <div className="sidebar-footer">
            <p>&copy; 2026 GMI Buses</p>
            <span>Version 0.0.1 - PRUEBA</span>
            <span>GNU GPLv3 - License ⚠️</span>

          </div>
        </div>
      </aside>
      <section className="app-main">
        <Header
          onLogout={onLogout}
          username={username}
          onToggleMenu={handleToggleSidebar}
          isSidebarOpen={isSidebarOpen}
        />
        <Outlet />
      </section>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState({
    isAuthenticated: false,
    username: null,
    userId: null,
  });
  const [isSessionLoading, setIsSessionLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      try {
        const currentSession = await fetchSession();
        if (isMounted) {
          setSession(currentSession);
        }
      } catch (error) {
        if (isMounted) {
          setSession({
            isAuthenticated: false,
            username: null,
            userId: null,
          });
        }
      } finally {
        if (isMounted) {
          setIsSessionLoading(false);
        }
      }
    }

    loadSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const isAuthenticated = useMemo(() => Boolean(session && session.isAuthenticated), [session]);

  async function handleLogout() {
    try {
      await logout();
    } catch (error) {
      // Even if logout fails, clear local session to avoid lock-in UI.
    }

    setSession({
      isAuthenticated: false,
      username: null,
      userId: null,
    });
  }

  function handleLoginSuccess(nextSession) {
    setSession({
      isAuthenticated: true,
      username: nextSession && nextSession.username ? nextSession.username : null,
      userId: nextSession && nextSession.userId ? nextSession.userId : null,
    });
  }

  if (isSessionLoading) {
    return (
      <main className="route-content">
        <section className="panel module-panel">
          <h2>Validando sesion</h2>
          <p className="module-description">Espera un momento...</p>
        </section>
      </main>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          isAuthenticated ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <LoginPage onLoginSuccess={handleLoginSuccess} />
          )
        }
      />
      <Route
        element={
          isAuthenticated ? (
            <ProtectedLayout onLogout={handleLogout} username={session && session.username ? session.username : ""} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      >
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/reportar-incidencia" element={<ReportIncidentPage />} />
        <Route path="/incidencias" element={<IncidentsPage />} />
        <Route path="/ordenes-trabajo" element={<WorkOrdersPage />} />
        <Route path="/mantenimiento" element={<MaintenancePage />} />
        <Route path="/vehiculo" element={<VehiclePage />} />
        <Route path="/vehiculos" element={<Navigate to="/vehiculo" replace />} />
        <Route path="/reportes" element={<ReportsPage />} />
      </Route>
      <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
    </Routes>
  );
}
