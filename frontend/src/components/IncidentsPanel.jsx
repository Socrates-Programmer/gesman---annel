import { memo } from "react";

function IncidentsPanel({
  rows,
  isLoading,
  loadError,
  onReload,
  searchText,
  onSearchTextChange,
  statusFilter,
  onStatusFilterChange,
  statusOptions,
  meta,
  onPrevPage,
  onNextPage,
  onView,
  onEdit,
  onDelete,
}) {
  const hasRows = Array.isArray(rows) && rows.length > 0;

  return (
    <section className="panel incidents-panel">
      <h2>Incidencias</h2>
      {loadError ? <p className="module-inline-alert">{loadError}</p> : null}
      <div className="table-toolbar">
        <div className="table-toolbar-fields">
          <label className="toolbar-field">
            <span>Buscar</span>
            <input
              type="search"
              value={searchText}
              onChange={(event) => onSearchTextChange(event.target.value)}
              placeholder="ID, descripcion o vehiculo"
              disabled={isLoading}
            />
          </label>

          <label className="toolbar-field">
            <span>Estado</span>
            <select value={statusFilter} onChange={(event) => onStatusFilterChange(event.target.value)} disabled={isLoading}>
              <option value="">Todos</option>
              {statusOptions.map((option) => (
                <option key={option.id} value={String(option.id)}>
                  {option.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <button className="small-btn" type="button" onClick={onReload} disabled={isLoading}>
          {isLoading ? "Actualizando..." : "Actualizar"}
        </button>
      </div>
      {!isLoading ? (
        <p className="table-results-meta">
          Mostrando {rows.length} de {meta.total} incidencias.
        </p>
      ) : null}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Descripcion</th>
              <th>Vehiculo</th>
              <th>Estado</th>
              <th>Prioridad</th>
              <th>Accion</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="6">Cargando incidencias...</td>
              </tr>
            ) : null}

            {!isLoading && !hasRows ? (
              <tr>
                <td colSpan="6">No hay incidencias para mostrar.</td>
              </tr>
            ) : null}

            {!isLoading && hasRows
              ? rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.code}</td>
                    <td>{row.description}</td>
                    <td>{row.vehicleLabel}</td>
                    <td>
                      <span className={`status-pill ${row.statusClass}`}>{row.statusLabel}</span>
                    </td>
                    <td>{row.priorityLabel}</td>
                    <td>
                      <button className="small-btn" type="button" onClick={() => onView(row)}>
                        Ver
                      </button>
                      <button className="small-btn" type="button" onClick={() => onEdit(row)}>
                        Editar
                      </button>
                      <button className="small-btn small-btn-icon" type="button" onClick={() => onDelete(row)}>
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))
              : null}
          </tbody>
        </table>
      </div>

      <div className="table-pagination">
        <button className="small-btn" type="button" onClick={onPrevPage} disabled={isLoading || !meta.hasPrevPage}>
          Anterior
        </button>
        <p className="table-pagination-meta">
          Pagina {meta.page} de {meta.totalPages} - {meta.total} incidencias
        </p>
        <button className="small-btn" type="button" onClick={onNextPage} disabled={isLoading || !meta.hasNextPage}>
          Siguiente
        </button>
      </div>
    </section>
  );
}

export default memo(IncidentsPanel);
