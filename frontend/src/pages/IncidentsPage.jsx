import { useCallback, useEffect, useMemo, useState } from "react";
import IncidentsPanel from "../components/IncidentsPanel";
import { fetchIncidentFormCatalogs } from "../data/catalogApi";
import {
  deleteIncident,
  fetchIncidentById,
  fetchIncidents,
  updateIncident,
} from "../data/incidentsApi";

const INCIDENT_PAGE_SIZE = 10;

const EMPTY_META = {
  total: 0,
  page: 1,
  pageSize: INCIDENT_PAGE_SIZE,
  totalPages: 1,
  hasNextPage: false,
  hasPrevPage: false,
};

const EMPTY_EDIT_FORM = {
  vehicleId: "",
  typeId: "",
  priorityId: "",
  statusId: "",
  description: "",
};

const EMPTY_CATALOGS = {
  vehicles: [],
  incidentTypes: [],
  priorities: [],
  incidentStatuses: [],
};

export default function IncidentsPage() {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(EMPTY_META);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [page, setPage] = useState(1);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [includeClosed, setIncludeClosed] = useState(false);

  const [catalogs, setCatalogs] = useState(EMPTY_CATALOGS);
  const [catalogError, setCatalogError] = useState("");

  const [viewIncident, setViewIncident] = useState(null);
  const [isViewLoading, setIsViewLoading] = useState(false);

  const [editingIncident, setEditingIncident] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_EDIT_FORM);
  const [editMessage, setEditMessage] = useState("");
  const [editMessageTone, setEditMessageTone] = useState("muted");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const statusOptions = useMemo(
    () => (catalogs && Array.isArray(catalogs.incidentStatuses) ? catalogs.incidentStatuses : []),
    [catalogs]
  );

  const selectedStatusName = useMemo(() => {
    const selected = statusOptions.find((item) => String(item.id) === String(statusFilter));
    return selected ? selected.name : "Todos";
  }, [statusFilter, statusOptions]);

  const sideStatusSummary = useMemo(() => {
    const totals = new Map();
    rows.forEach((row) => {
      const key = String(row.statusId);
      const currentTotal = totals.get(key) || 0;
      totals.set(key, currentTotal + 1);
    });

    return statusOptions.map((status) => ({
      id: status.id,
      name: status.name,
      totalInPage: totals.get(String(status.id)) || 0,
    }));
  }, [rows, statusOptions]);

  const loadCatalogs = useCallback(async () => {
    try {
      const payload = await fetchIncidentFormCatalogs();
      setCatalogs({
        vehicles: Array.isArray(payload.vehicles) ? payload.vehicles : [],
        incidentTypes: Array.isArray(payload.incidentTypes) ? payload.incidentTypes : [],
        priorities: Array.isArray(payload.priorities) ? payload.priorities : [],
        incidentStatuses: Array.isArray(payload.incidentStatuses) ? payload.incidentStatuses : [],
      });
      setCatalogError("");
    } catch (error) {
      setCatalogError(error && error.message ? error.message : "No se pudieron cargar los catalogos.");
      setCatalogs(EMPTY_CATALOGS);
    }
  }, []);

  const loadIncidents = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");

    try {
      const response = await fetchIncidents({
        page,
        limit: INCIDENT_PAGE_SIZE,
        q: searchText,
        statusId: statusFilter,
        includeClosed,
      });
      setRows(Array.isArray(response.rows) ? response.rows : []);
      setMeta(response.meta || EMPTY_META);
    } catch (error) {
      setRows([]);
      setMeta({
        ...EMPTY_META,
        page,
      });
      setLoadError(error && error.message ? error.message : "No se pudieron cargar las incidencias.");
    } finally {
      setIsLoading(false);
    }
  }, [includeClosed, page, searchText, statusFilter]);

  useEffect(() => {
    loadCatalogs();
  }, [loadCatalogs]);

  useEffect(() => {
    setPage(1);
  }, [searchText, statusFilter, includeClosed]);

  useEffect(() => {
    loadIncidents();
  }, [loadIncidents]);

  async function handleViewIncident(row) {
    setIsViewLoading(true);
    setViewIncident(null);

    try {
      const incident = await fetchIncidentById(row.id);
      setViewIncident(incident);
    } catch (error) {
      setLoadError(error && error.message ? error.message : "No se pudo cargar el detalle de la incidencia.");
    } finally {
      setIsViewLoading(false);
    }
  }

  async function handleEditIncident(row) {
    setEditMessage("");
    setEditMessageTone("muted");

    try {
      const incident = await fetchIncidentById(row.id);
      if (!incident) {
        return;
      }

      setEditingIncident(incident);
      setEditForm({
        vehicleId: incident.vehicleId ? String(incident.vehicleId) : "",
        typeId: incident.typeId ? String(incident.typeId) : "",
        priorityId: incident.priorityId ? String(incident.priorityId) : "",
        statusId: incident.statusId ? String(incident.statusId) : "",
        description: incident.description || "",
      });
    } catch (error) {
      setLoadError(error && error.message ? error.message : "No se pudo cargar la incidencia para editar.");
    }
  }

  async function handleDeleteIncident(row) {
    const shouldDelete = window.confirm(
      `Se cerrara logicamente la incidencia ${row.code}. Esta accion no borra fisicamente el registro.`
    );
    if (!shouldDelete) {
      return;
    }

    try {
      await deleteIncident(row.id);
      await loadIncidents();
    } catch (error) {
      setLoadError(error && error.message ? error.message : "No se pudo eliminar la incidencia.");
    }
  }

  async function handleSubmitEdit(event) {
    event.preventDefault();
    if (!editingIncident || !editingIncident.id) {
      return;
    }

    setIsSavingEdit(true);
    setEditMessage("Guardando cambios...");
    setEditMessageTone("muted");

    try {
      await updateIncident(editingIncident.id, editForm);
      setEditMessage("Incidencia actualizada correctamente.");
      setEditMessageTone("success");
      await loadIncidents();
      setEditingIncident(null);
      setEditForm(EMPTY_EDIT_FORM);
      setEditMessage("");
    } catch (error) {
      setEditMessage(error && error.message ? error.message : "No se pudo actualizar la incidencia.");
      setEditMessageTone("error");
    } finally {
      setIsSavingEdit(false);
    }
  }

  function handleCloseEditModal() {
    setEditingIncident(null);
    setEditForm(EMPTY_EDIT_FORM);
    setEditMessage("");
    setEditMessageTone("muted");
  }

  return (
    <main className="route-content module-route incidents-module-route">
      <section className="panel module-hero incidents-module-hero">
        <div>
          <p className="module-eyebrow">Centro de Incidencias</p>
          <h2>Incidencias</h2>
          <p className="module-description">
            Gestion real con SQL Server: consulta, filtros, edicion y cierre logico.
          </p>
        </div>
        <div className="module-hero-stats">
          <article className="module-hero-chip tone-gold">
            <span>Total filtradas</span>
            <strong>{meta.total}</strong>
          </article>
          <article className="module-hero-chip tone-blue">
            <span>Estado activo</span>
            <strong>{selectedStatusName}</strong>
          </article>
          <article className="module-hero-chip tone-blue">
            <span>Pagina</span>
            <strong>{meta.page}</strong>
          </article>
          <article className="module-hero-chip tone-gold">
            <span>Incluye cerradas</span>
            <strong>{includeClosed ? "Si" : "No"}</strong>
          </article>
        </div>
      </section>

      <section className="module-grid-main-pro">
        <IncidentsPanel
          rows={rows}
          isLoading={isLoading}
          loadError={loadError}
          onReload={loadIncidents}
          searchText={searchText}
          onSearchTextChange={setSearchText}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          statusOptions={statusOptions}
          meta={meta}
          onPrevPage={() => setPage((currentPage) => (meta.hasPrevPage ? currentPage - 1 : currentPage))}
          onNextPage={() => setPage((currentPage) => (meta.hasNextPage ? currentPage + 1 : currentPage))}
          onView={handleViewIncident}
          onEdit={handleEditIncident}
          onDelete={handleDeleteIncident}
        />

        <section className="module-aside-stack">
          <section className="panel module-panel">
            <h2>Filtros Rapidos</h2>
            <div className="filter-list">
              <button
                className={`small-btn ${statusFilter === "" ? "small-btn-active" : ""}`}
                type="button"
                onClick={() => setStatusFilter("")}
              >
                Todos
              </button>
              {sideStatusSummary.map((item) => (
                <button
                  key={item.id}
                  className={`small-btn ${String(statusFilter) === String(item.id) ? "small-btn-active" : ""}`}
                  type="button"
                  onClick={() => setStatusFilter(String(item.id))}
                >
                  {item.name} ({item.totalInPage})
                </button>
              ))}
            </div>
            <div className="filter-list filter-list-spaced">
              <button
                className={`small-btn ${includeClosed ? "small-btn-active" : ""}`}
                type="button"
                onClick={() => setIncludeClosed((current) => !current)}
              >
                {includeClosed ? "Ocultar Cerradas" : "Mostrar Cerradas"}
              </button>
            </div>
          </section>

          <section className="panel module-panel">
            <h2>Estado de Catalogos</h2>
            {catalogError ? <p className="module-inline-alert">{catalogError}</p> : null}
            {!catalogError ? (
              <ul className="module-list compact">
                <li>
                  <strong>Vehiculos activos</strong>
                  <span className="list-tag">{catalogs.vehicles.length}</span>
                </li>
                <li>
                  <strong>Tipos de incidencia</strong>
                  <span className="list-tag">{catalogs.incidentTypes.length}</span>
                </li>
                <li>
                  <strong>Prioridades</strong>
                  <span className="list-tag">{catalogs.priorities.length}</span>
                </li>
                <li>
                  <strong>Estados</strong>
                  <span className="list-tag">{catalogs.incidentStatuses.length}</span>
                </li>
              </ul>
            ) : null}
          </section>
        </section>
      </section>

      {isViewLoading ? (
        <section className="modal-overlay">
          <article className="modal-card">
            <h3>Cargando detalle...</h3>
          </article>
        </section>
      ) : null}

      {viewIncident ? (
        <section className="modal-overlay" role="dialog" aria-modal="true">
          <article className="modal-card">
            <div className="modal-header">
              <h3>Detalle de Incidencia {viewIncident.code}</h3>
              <button className="small-btn" type="button" onClick={() => setViewIncident(null)}>
                Cerrar
              </button>
            </div>
            <dl className="modal-detail-grid">
              <div>
                <dt>Vehiculo</dt>
                <dd>{viewIncident.vehicleLabel}</dd>
              </div>
              <div>
                <dt>Tipo</dt>
                <dd>{viewIncident.typeLabel}</dd>
              </div>
              <div>
                <dt>Prioridad</dt>
                <dd>{viewIncident.priorityLabel}</dd>
              </div>
              <div>
                <dt>Estado</dt>
                <dd>{viewIncident.statusLabel}</dd>
              </div>
              <div>
                <dt>Fecha creacion</dt>
                <dd>{formatDateTime(viewIncident.createdAt)}</dd>
              </div>
              <div>
                <dt>Fecha cierre</dt>
                <dd>{viewIncident.closedAt ? formatDateTime(viewIncident.closedAt) : "Abierta"}</dd>
              </div>
            </dl>
            <article className="modal-description">
              <h4>Descripcion</h4>
              <p>{viewIncident.description || "Sin descripcion"}</p>
            </article>
          </article>
        </section>
      ) : null}

      {editingIncident ? (
        <section className="modal-overlay" role="dialog" aria-modal="true">
          <article className="modal-card">
            <div className="modal-header">
              <h3>Editar Incidencia {editingIncident.code}</h3>
              <button className="small-btn" type="button" onClick={handleCloseEditModal} disabled={isSavingEdit}>
                Cerrar
              </button>
            </div>
            <form className="edit-form-grid" onSubmit={handleSubmitEdit}>
              <label htmlFor="editVehicleId">Vehiculo</label>
              <select
                id="editVehicleId"
                value={editForm.vehicleId}
                onChange={(event) => setEditForm((current) => ({ ...current, vehicleId: event.target.value }))}
                required
                disabled={isSavingEdit}
              >
                <option value="">Selecciona un vehiculo</option>
                {(catalogs.vehicles || []).map((item) => (
                  <option key={item.id} value={String(item.id)}>
                    {item.label}
                  </option>
                ))}
              </select>

              <label htmlFor="editTypeId">Tipo de incidencia</label>
              <select
                id="editTypeId"
                value={editForm.typeId}
                onChange={(event) => setEditForm((current) => ({ ...current, typeId: event.target.value }))}
                required
                disabled={isSavingEdit}
              >
                <option value="">Selecciona un tipo</option>
                {(catalogs.incidentTypes || []).map((item) => (
                  <option key={item.id} value={String(item.id)}>
                    {item.name}
                  </option>
                ))}
              </select>

              <label htmlFor="editPriorityId">Prioridad</label>
              <select
                id="editPriorityId"
                value={editForm.priorityId}
                onChange={(event) => setEditForm((current) => ({ ...current, priorityId: event.target.value }))}
                required
                disabled={isSavingEdit}
              >
                <option value="">Selecciona una prioridad</option>
                {(catalogs.priorities || []).map((item) => (
                  <option key={item.id} value={String(item.id)}>
                    {item.name}
                  </option>
                ))}
              </select>

              <label htmlFor="editStatusId">Estado</label>
              <select
                id="editStatusId"
                value={editForm.statusId}
                onChange={(event) => setEditForm((current) => ({ ...current, statusId: event.target.value }))}
                required
                disabled={isSavingEdit}
              >
                <option value="">Selecciona un estado</option>
                {(catalogs.incidentStatuses || []).map((item) => (
                  <option key={item.id} value={String(item.id)}>
                    {item.name}
                  </option>
                ))}
              </select>

              <label htmlFor="editDescription">Descripcion</label>
              <textarea
                id="editDescription"
                rows="4"
                minLength={8}
                maxLength={1000}
                value={editForm.description}
                onChange={(event) => setEditForm((current) => ({ ...current, description: event.target.value }))}
                required
                disabled={isSavingEdit}
              />

              <div className="edit-form-actions">
                <button className="small-btn" type="button" onClick={handleCloseEditModal} disabled={isSavingEdit}>
                  Cancelar
                </button>
                <button className="small-btn primary" type="submit" disabled={isSavingEdit}>
                  {isSavingEdit ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
              <p className={`form-message ${editMessageTone}`}>{editMessage}</p>
            </form>
          </article>
        </section>
      ) : null}
    </main>
  );
}

function formatDateTime(value) {
  if (!value) {
    return "N/A";
  }
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return "N/A";
  }
  return parsedDate.toLocaleString("es-DO");
}
