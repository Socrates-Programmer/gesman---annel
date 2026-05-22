import { useEffect, useMemo, useRef, useState } from "react";
import { fetchActiveVehicles, fetchVehicleDetail } from "../data/vehiclesApi";

const VEHICLE_PAGE_SIZE = 10;

const EMPTY_META = {
  total: 0,
  page: 1,
  pageSize: VEHICLE_PAGE_SIZE,
  totalPages: 1,
  hasNextPage: false,
  hasPrevPage: false,
  summary: {
    totalVehicles: 0,
    activeVehicles: 0,
    inactiveVehicles: 0,
  },
};

export default function VehiclePage() {
  const [vehicleRows, setVehicleRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState(EMPTY_META);

  const [statusFilter, setStatusFilter] = useState("");
  const [regionalFilter, setRegionalFilter] = useState("");
  const [districtFilter, setDistrictFilter] = useState("");
  const [brandModelFilter, setBrandModelFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const detailContextCacheRef = useRef(new Map());
  const [detailContextVersion, setDetailContextVersion] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function loadActiveVehicles() {
      setIsLoading(true);
      setLoadError("");

      try {
        const response = await fetchActiveVehicles({
          page,
          limit: VEHICLE_PAGE_SIZE,
          brand: brandModelFilter,
          regionalId: regionalFilter,
          districtId: districtFilter,
        });

        if (!isMounted) {
          return;
        }

        setVehicleRows(Array.isArray(response.rows) ? response.rows : []);
        setMeta(response.meta || EMPTY_META);
      } catch (error) {
        if (!isMounted) {
          return;
        }
        setVehicleRows([]);
        setMeta({
          ...EMPTY_META,
          page,
          hasPrevPage: page > 1,
        });
        setLoadError(error && error.message ? error.message : "No se pudieron cargar los buses.");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadActiveVehicles();

    return () => {
      isMounted = false;
    };
  }, [page, brandModelFilter, regionalFilter, districtFilter]);

  useEffect(() => {
    if (vehicleRows.length === 0) {
      setSelectedVehicleId("");
      setSelectedVehicle(null);
      return;
    }

    const currentSelectionExists = vehicleRows.some(
      (vehicleRow) => String(vehicleRow.id) === String(selectedVehicleId)
    );

    if (!currentSelectionExists) {
      openVehicleDetail(vehicleRows[0].id);
    }
  }, [vehicleRows, selectedVehicleId]);

  useEffect(() => {
    let isCancelled = false;
    const missingRows = vehicleRows.filter(
      (row) => !detailContextCacheRef.current.has(String(row.id))
    );

    if (!missingRows.length) {
      setDetailContextVersion((currentVersion) => currentVersion + 1);
      return () => {
        isCancelled = true;
      };
    }

    async function loadMissingContexts() {
      const detailResponses = await Promise.all(
        missingRows.map((row) =>
          fetchVehicleDetail(row.id)
            .then((detail) => ({ id: String(row.id), detail }))
            .catch(() => ({ id: String(row.id), detail: null }))
        )
      );

      if (isCancelled) {
        return;
      }

      detailResponses.forEach((response) => {
        detailContextCacheRef.current.set(
          response.id,
          extractVehicleListContext(response.detail)
        );
      });

      setDetailContextVersion((currentVersion) => currentVersion + 1);
    }

    loadMissingContexts();

    return () => {
      isCancelled = true;
    };
  }, [vehicleRows]);

  const summary = meta && meta.summary ? meta.summary : EMPTY_META.summary;

  const decoratedRows = useMemo(
    () => buildDecoratedRows(vehicleRows, detailContextCacheRef.current),
    [vehicleRows, detailContextVersion]
  );

  const fleetMetrics = useMemo(
    () => buildFleetMetrics(summary, decoratedRows),
    [summary, decoratedRows]
  );

  const filteredRows = useMemo(() => {
    return decoratedRows.filter((row) => {
      if (statusFilter && row.statusBucket !== statusFilter) {
        return false;
      }

      if (regionalFilter && String(row.regionalId || "") !== regionalFilter) {
        return false;
      }

      if (districtFilter && String(row.districtId || "") !== districtFilter) {
        return false;
      }

      if (
        brandModelFilter &&
        normalizeBrandLabel(row.type) !== normalizeBrandLabel(brandModelFilter)
      ) {
        return false;
      }

      if (!searchTerm.trim()) {
        return true;
      }

      const query = searchTerm.trim().toLowerCase();
      return [row.code, row.plate, row.type, row.regional, row.district, row.status]
        .map((value) => normalizeText(value))
        .some((value) => value.toLowerCase().includes(query));
    });
  }, [decoratedRows, districtFilter, regionalFilter, brandModelFilter, searchTerm, statusFilter]);

  const regionalOptions = useMemo(
    () =>
      (meta && Array.isArray(meta.availabilityByRegional) ? meta.availabilityByRegional : [])
        .map((item) => ({
          value: String(item && item.id ? item.id : ""),
          label: normalizeText(item && item.label, ""),
        }))
        .filter((item) => item.value && item.label),
    [meta]
  );

  const districtOptions = useMemo(
    () =>
      (meta && Array.isArray(meta.availabilityByDistrict) ? meta.availabilityByDistrict : [])
        .map((item) => ({
          value: String(item && item.id ? item.id : ""),
          label: normalizeText(item && item.label, ""),
        }))
        .filter((item) => item.value && item.label),
    [meta]
  );

  const brandModelOptions = useMemo(() => {
    const metaBrandOptions = collectDistinctValues(
      (meta && Array.isArray(meta.availabilityByBrand) ? meta.availabilityByBrand : []).map(
        (item) => normalizeBrandLabel(item && item.label)
      ),
      ["N/D"]
    );

    if (metaBrandOptions.length > 0) {
      return metaBrandOptions;
    }

    return collectDistinctValues(
      decoratedRows.map((row) => normalizeBrandLabel(row.type)),
      ["N/D"]
    );
  }, [decoratedRows, meta]);

  useEffect(() => {
    if (regionalFilter && !regionalOptions.some((option) => option.value === regionalFilter)) {
      setRegionalFilter("");
    }
  }, [regionalFilter, regionalOptions]);

  useEffect(() => {
    if (districtFilter && !districtOptions.some((option) => option.value === districtFilter)) {
      setDistrictFilter("");
    }
  }, [districtFilter, districtOptions]);

  const selectedVehicleDecorated = useMemo(() => {
    if (!selectedVehicle) {
      return null;
    }
    return mapDetailToPresentation(selectedVehicle);
  }, [selectedVehicle]);

  const paginationStart = useMemo(() => {
    const safePage = Number(meta && meta.page) > 0 ? Number(meta.page) : 1;
    const safePageSize =
      Number(meta && meta.pageSize) > 0 ? Number(meta.pageSize) : VEHICLE_PAGE_SIZE;

    if (!filteredRows.length) {
      return 0;
    }

    return (safePage - 1) * safePageSize + 1;
  }, [filteredRows.length, meta]);

  const paginationEnd = useMemo(() => {
    const safeTotal = Number(meta && meta.total) > 0 ? Number(meta.total) : 0;
    if (!filteredRows.length) {
      return 0;
    }
    return safeTotal > 0
      ? Math.min(safeTotal, paginationStart + filteredRows.length - 1)
      : paginationStart + filteredRows.length - 1;
  }, [filteredRows.length, meta, paginationStart]);

  function handleBrandFilterChange(event) {
    const nextBrand = normalizeText(event && event.target ? event.target.value : "", "");
    setPage(1);
    setBrandModelFilter(nextBrand);
  }

  function handleRegionalFilterChange(event) {
    const nextRegionalId = normalizeText(event && event.target ? event.target.value : "", "");
    setPage(1);
    setRegionalFilter(nextRegionalId);
    setDistrictFilter("");
  }

  function handleDistrictFilterChange(event) {
    const nextDistrictId = normalizeText(event && event.target ? event.target.value : "", "");
    setPage(1);
    setDistrictFilter(nextDistrictId);
  }

  async function openVehicleDetail(vehicleId) {
    const normalizedVehicleId = String(vehicleId || "");
    if (!normalizedVehicleId) {
      return;
    }

    setSelectedVehicleId(normalizedVehicleId);
    setIsDetailLoading(true);
    setDetailError("");

    try {
      const detail = await fetchVehicleDetail(normalizedVehicleId);
      setSelectedVehicle(detail);
    } catch (error) {
      setSelectedVehicle(null);
      setDetailError(error && error.message ? error.message : "No se pudo cargar el detalle del bus.");
    } finally {
      setIsDetailLoading(false);
    }
  }

  function exportVisibleRows() {
    const rowsToExport = filteredRows.length > 0 ? filteredRows : decoratedRows;
    const headers = [
      "Ficha",
      "Placa",
      "Marca",
      "Regional",
      "Distrito",
      "Estado",
      "Kilometraje",
      "Proximo mantenimiento",
    ];

    const csvRows = rowsToExport.map((row) => [
      row.code,
      row.plate,
      row.type,
      row.regional,
      row.district,
      row.status,
      row.mileage,
      row.nextMaintenance,
    ]);

    const csvContent = [headers, ...csvRows]
      .map((csvRow) => csvRow.map((value) => `"${String(value || "").replaceAll("\"", "\"\"")}"`).join(","))
      .join("\n");

    const csvBlob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const csvUrl = URL.createObjectURL(csvBlob);
    const anchor = document.createElement("a");
    anchor.href = csvUrl;
    anchor.download = "buses.csv";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(csvUrl);
  }

  return (
    <main className="route-content buses-route">
      <section className="buses-toolbar">
        <div className="buses-toolbar-actions">
          <button type="button" className="small-btn primary buses-cta-btn">
            <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
              <path d="M12 5v14M5 12h14"></path>
            </svg>
            Nuevo bus
          </button>
          <button type="button" className="small-btn buses-outline-btn" onClick={exportVisibleRows}>
            <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
              <path d="M12 4v11"></path>
              <path d="M8 10l4 4 4-4"></path>
              <path d="M5 18h14"></path>
            </svg>
            Exportar
          </button>
        </div>

        <div className="buses-toolbar-filters">
          <label className="buses-select-wrap">
            <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
              <path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11z"></path>
              <circle cx="12" cy="10" r="2.7"></circle>
            </svg>
            <select value={regionalFilter} onChange={handleRegionalFilterChange}>
              <option value="">Regional</option>
              {regionalOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="buses-select-wrap">
            <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
              <path d="M4 6h16"></path>
              <path d="M4 12h10"></path>
              <path d="M4 18h16"></path>
              <circle cx="17" cy="12" r="2.4"></circle>
            </svg>
            <select value={districtFilter} onChange={handleDistrictFilterChange}>
              <option value="">Distrito</option>
              {districtOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="buses-select-wrap">
            <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
              <path d="M4 7h16"></path>
              <path d="M4 12h16"></path>
              <path d="M4 17h16"></path>
            </svg>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="">Estado</option>
              <option value="active">Operativo</option>
              <option value="maintenance">En mantenimiento</option>
              <option value="inactive">Fuera de servicio</option>
            </select>
          </label>

          <label className="buses-select-wrap">
            <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
              <path d="M4 6h16"></path>
              <path d="M4 12h16"></path>
              <path d="M4 18h16"></path>
            </svg>
            <select
              value={brandModelFilter}
              onChange={handleBrandFilterChange}
            >
              <option value="">Marca</option>
              {brandModelOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="buses-search-wrap" htmlFor="busSearch">
            <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
              <circle cx="11" cy="11" r="7"></circle>
              <path d="M20 20l-3.5-3.5"></path>
            </svg>
            <input
              id="busSearch"
              type="search"
              placeholder="Buscar por ficha, placa o ruta"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </label>
        </div>
      </section>

      <section className="buses-kpi-grid">
        <article className="panel buses-kpi-card">
          <span className="buses-kpi-icon tone-blue" aria-hidden="true">
            <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
              <path d="M6 16h12"></path>
              <path d="M5 16V9a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v7"></path>
              <circle cx="8" cy="18" r="1.5"></circle>
              <circle cx="16" cy="18" r="1.5"></circle>
            </svg>
          </span>
          <div className="buses-kpi-copy">
            <p>Total de buses</p>
            <strong>{fleetMetrics.total}</strong>
            <small>En toda la flota</small>
          </div>
        </article>

        <article className="panel buses-kpi-card">
          <span className="buses-kpi-icon tone-green" aria-hidden="true">
            <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
              <circle cx="12" cy="12" r="8"></circle>
              <path d="M8.5 12.2l2.3 2.3 4.7-4.7"></path>
            </svg>
          </span>
          <div className="buses-kpi-copy">
            <p>Operativos</p>
            <strong>{fleetMetrics.active}</strong>
            <small>{fleetMetrics.activePercent}% del total</small>
          </div>
        </article>

        <article className="panel buses-kpi-card">
          <span className="buses-kpi-icon tone-gold" aria-hidden="true">
            <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
              <path d="M12 4l9 16H3z"></path>
              <path d="M12 9v4"></path>
              <circle cx="12" cy="16.5" r="0.8"></circle>
            </svg>
          </span>
          <div className="buses-kpi-copy">
            <p>En mantenimiento</p>
            <strong>{fleetMetrics.maintenance}</strong>
            <small>{fleetMetrics.maintenancePercent}% del total</small>
          </div>
        </article>

        <article className="panel buses-kpi-card">
          <span className="buses-kpi-icon tone-red" aria-hidden="true">
            <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
              <path d="M6 16h12"></path>
              <path d="M5 16V9a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v7"></path>
              <circle cx="8" cy="18" r="1.5"></circle>
              <circle cx="16" cy="18" r="1.5"></circle>
              <path d="M15.7 7.2l4 4"></path>
              <path d="M19.7 7.2l-4 4"></path>
            </svg>
          </span>
          <div className="buses-kpi-copy">
            <p>Fuera de servicio</p>
            <strong>{fleetMetrics.inactive}</strong>
            <small>{fleetMetrics.inactivePercent}% del total</small>
          </div>
        </article>
      </section>

      <section className="buses-main-grid">
        <section className="panel buses-list-card">
          <div className="buses-card-header">
            <h2>Listado de buses</h2>
          </div>

          <div className="table-wrap buses-table-wrap">
            <table className="buses-table">
              <thead>
                <tr>
                  <th>Ficha</th>
                  <th>Placa</th>
                  <th>Marca</th>
                  <th>Regional</th>
                  <th>Distrito</th>
                  <th>Estado</th>
                  <th>Kilometraje</th>
                  <th>Proximo mantenimiento</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan="9">Cargando buses...</td>
                  </tr>
                ) : null}

                {!isLoading && loadError ? (
                  <tr>
                    <td colSpan="9">{loadError}</td>
                  </tr>
                ) : null}

                {!isLoading && !loadError && filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan="9">No hay buses para mostrar.</td>
                  </tr>
                ) : null}

                {!isLoading && !loadError
                  ? filteredRows.map((row) => (
                      <tr
                        key={row.id}
                        className={String(selectedVehicleId) === String(row.id) ? "table-row-selected" : ""}
                      >
                        <td>
                          <button
                            type="button"
                            className="table-link-btn buses-row-link"
                            onClick={() => openVehicleDetail(row.id)}
                          >
                            {row.code}
                          </button>
                        </td>
                        <td>{row.plate}</td>
                        <td>{row.type}</td>
                        <td>{row.regional}</td>
                        <td>{row.district}</td>
                        <td>
                          <span className={`status-pill ${row.statusClass}`}>{row.status}</span>
                        </td>
                        <td>{row.mileage}</td>
                        <td>{row.nextMaintenance}</td>
                        <td>
                          <button
                            type="button"
                            className="buses-row-action"
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
                    ))
                  : null}
              </tbody>
            </table>
          </div>

          <div className="buses-pagination">
            <p className="table-pagination-meta">
              Mostrando {paginationStart} a {paginationEnd} de {meta.total} buses
            </p>

            <div className="buses-pagination-controls">
              <button
                className="buses-page-arrow"
                type="button"
                onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                disabled={isLoading || !meta.hasPrevPage}
                aria-label="Pagina anterior"
              >
                <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
                  <path d="M14.5 7.5L10 12l4.5 4.5"></path>
                </svg>
              </button>

              <span className="buses-page-current">{meta.page || 1}</span>

              <button
                className="buses-page-arrow"
                type="button"
                onClick={() =>
                  setPage((currentPage) => (meta.hasNextPage ? currentPage + 1 : currentPage))
                }
                disabled={isLoading || !meta.hasNextPage}
                aria-label="Pagina siguiente"
              >
                <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
                  <path d="M9.5 7.5L14 12l-4.5 4.5"></path>
                </svg>
              </button>
            </div>
          </div>
        </section>

        <aside className="buses-side-stack">
          <section className="panel buses-fleet-card">
            <div className="buses-card-header">
              <h2>Estado de la flota</h2>
            </div>

            <div className="buses-fleet-body">
              <div className="buses-fleet-donut" style={buildFleetDonutStyle(fleetMetrics)}>
                <div className="buses-fleet-center">
                  <span>Total</span>
                  <strong>{fleetMetrics.total}</strong>
                  <small>buses</small>
                </div>
              </div>

              <ul className="buses-fleet-legend">
                <li>
                  <span className="dot success"></span>
                  Operativos
                  <strong>
                    {fleetMetrics.active} ({fleetMetrics.activePercent}%)
                  </strong>
                </li>
                <li>
                  <span className="dot warning"></span>
                  En mantenimiento
                  <strong>
                    {fleetMetrics.maintenance} ({fleetMetrics.maintenancePercent}%)
                  </strong>
                </li>
                <li>
                  <span className="dot danger"></span>
                  Fuera de servicio
                  <strong>
                    {fleetMetrics.inactive} ({fleetMetrics.inactivePercent}%)
                  </strong>
                </li>
              </ul>
            </div>
          </section>

          <section className="panel buses-detail-card">
            <div className="buses-card-header">
              <h2>Detalle del bus</h2>
            </div>

            {isDetailLoading ? <p className="module-description">Cargando detalle...</p> : null}

            {!isDetailLoading && detailError ? (
              <p className="module-inline-alert">{detailError}</p>
            ) : null}

            {!isDetailLoading && !detailError && selectedVehicleDecorated ? (
              <div className="buses-detail-body">
                <div className="buses-detail-hero">
                  <div className="buses-detail-vehicle-visual" aria-hidden="true">
                    <svg viewBox="0 0 140 88" role="img" aria-hidden="true">
                      <path d="M16 58h108v10H16z"></path>
                      <path d="M26 26h78l20 24H16z"></path>
                      <path d="M33 33h31v16H33z"></path>
                      <path d="M71 33h23v16H71z"></path>
                      <circle cx="40" cy="70" r="8"></circle>
                      <circle cx="101" cy="70" r="8"></circle>
                    </svg>
                  </div>

                  <dl className="buses-detail-grid">
                    <div>
                      <dt>Ficha:</dt>
                      <dd>{selectedVehicleDecorated.code}</dd>
                    </div>
                    <div>
                      <dt>Placa:</dt>
                      <dd>{selectedVehicleDecorated.plate}</dd>
                    </div>
                    <div>
                      <dt>Chofer asignado:</dt>
                      <dd>{selectedVehicleDecorated.driver}</dd>
                    </div>
                    <div>
                      <dt>Ruta:</dt>
                      <dd>{selectedVehicleDecorated.route}</dd>
                    </div>
                    <div>
                      <dt>Estado:</dt>
                      <dd>
                        <span className={`status-pill ${selectedVehicleDecorated.statusClass}`}>
                          {selectedVehicleDecorated.status}
                        </span>
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="buses-detail-extra">
                  <p>
                    <strong>Ultima incidencia:</strong> {selectedVehicleDecorated.lastIncident}
                  </p>
                  <p>
                    <strong>Ultimo mantenimiento:</strong> {selectedVehicleDecorated.lastMaintenance}
                  </p>
                </div>

                <button type="button" className="small-btn buses-full-record-btn">
                  Ver ficha completa
                </button>
              </div>
            ) : null}
          </section>
        </aside>
      </section>
    </main>
  );
}

function buildDecoratedRows(vehicleRows, detailContextCache) {
  return vehicleRows.map((row) => {
    const statusBucket = classifyVehicleStatus(row.status);
    const detailContext =
      detailContextCache && detailContextCache.has(String(row.id))
        ? detailContextCache.get(String(row.id))
        : null;

    return {
      id: String(row.id || ""),
      code: normalizeText(row.code, "N/D"),
      plate: normalizeText(row.plate, "N/D"),
      type: buildBrandLabel(detailContext, row.brand || row.type),
      status: normalizeText(row.status, "N/D"),
      statusClass: normalizeText(row.statusClass, "vehicle-default"),
      statusBucket,
      regionalId:
        row.regionalId === null || row.regionalId === undefined || row.regionalId === ""
          ? ""
          : String(row.regionalId),
      districtId:
        row.districtId === null || row.districtId === undefined || row.districtId === ""
          ? ""
          : String(row.districtId),
      regional: normalizeText(
        row.regionalName,
        normalizeText(detailContext && detailContext.regional, "N/D")
      ),
      district: normalizeText(
        row.districtName,
        normalizeText(detailContext && detailContext.district, "N/D")
      ),
      mileage: "N/D",
      nextMaintenance: "N/D",
    };
  });
}

function buildFleetMetrics(summary, rows) {
  const total = Number(summary && summary.totalVehicles) || 0;
  const active = Number(summary && summary.activeVehicles) || 0;
  const inactiveSummary = Number(summary && summary.inactiveVehicles) || 0;

  const currentStatusCounts = rows.reduce(
    (accumulator, row) => {
      if (row.statusBucket === "maintenance") {
        accumulator.maintenance += 1;
      } else if (row.statusBucket === "inactive") {
        accumulator.inactive += 1;
      }
      return accumulator;
    },
    { maintenance: 0, inactive: 0 }
  );

  const currentInactiveTotal = currentStatusCounts.maintenance + currentStatusCounts.inactive;

  let estimatedMaintenance = 0;
  let estimatedInactive = inactiveSummary;

  if (inactiveSummary > 0 && currentInactiveTotal > 0) {
    estimatedMaintenance = Math.round(
      (currentStatusCounts.maintenance / currentInactiveTotal) * inactiveSummary
    );
    estimatedInactive = Math.max(0, inactiveSummary - estimatedMaintenance);
  }

  const totalWithFallback = total > 0 ? total : rows.length;
  const used = active + estimatedMaintenance + estimatedInactive;
  if (totalWithFallback > used) {
    estimatedInactive += totalWithFallback - used;
  }

  return {
    total: totalWithFallback,
    active,
    maintenance: estimatedMaintenance,
    inactive: estimatedInactive,
    activePercent: resolvePercent(active, totalWithFallback),
    maintenancePercent: resolvePercent(estimatedMaintenance, totalWithFallback),
    inactivePercent: resolvePercent(estimatedInactive, totalWithFallback),
  };
}

function buildFleetDonutStyle(fleetMetrics) {
  const activePercent = fleetMetrics.activePercent;
  const maintenancePercent = fleetMetrics.maintenancePercent;
  const maintenanceEnd = activePercent + maintenancePercent;

  return {
    background: `conic-gradient(
      #4a9f67 0 ${activePercent}%,
      #d4a631 ${activePercent}% ${maintenanceEnd}%,
      #d94b4b ${maintenanceEnd}% 100%
    )`,
  };
}

function resolvePercent(value, total) {
  const safeValue = Number(value) || 0;
  const safeTotal = Number(total) || 0;
  if (!safeTotal) {
    return 0;
  }
  return Math.round((safeValue / safeTotal) * 100);
}

function classifyVehicleStatus(statusName) {
  const comparableStatus = normalizeText(statusName).toLowerCase();

  if (comparableStatus.includes("manten")) {
    return "maintenance";
  }

  if (
    comparableStatus.includes("fuera") ||
    comparableStatus.includes("inact") ||
    comparableStatus.includes("baja") ||
    comparableStatus.includes("repar") ||
    comparableStatus.includes("accident") ||
    comparableStatus.includes("retir")
  ) {
    return "inactive";
  }

  return "active";
}

function mapDetailToPresentation(selectedVehicle) {
  const attributes = Array.isArray(selectedVehicle.attributes) ? selectedVehicle.attributes : [];

  return {
    code: normalizeText(selectedVehicle.ficha, "No disponible"),
    plate: normalizeText(selectedVehicle.placa, "No disponible"),
    status: normalizeText(selectedVehicle.estadoNombre, "No disponible"),
    statusClass: normalizeText(selectedVehicle.statusClass, "vehicle-default"),
    driver: resolveAttributeValue(attributes, ["chofer", "conductor", "driver", "mecanico"], "No asignado"),
    route: resolveAttributeValue(attributes, ["ruta", "trayecto", "route"], "N/D"),
    lastIncident: resolveAttributeValue(
      attributes,
      ["ultima_incidencia", "incidencia", "falla"],
      "No registrada"
    ),
    lastMaintenance: resolveAttributeValue(
      attributes,
      ["ultimo_mantenimiento", "fecha_ultimo_mantenimiento", "mantenimiento"],
      "No registrado"
    ),
  };
}

function resolveAttributeValue(attributes, probableKeys, fallbackValue) {
  if (!Array.isArray(attributes) || attributes.length === 0) {
    return fallbackValue;
  }

  const normalizedKeys = probableKeys.map((key) => String(key || "").toLowerCase());
  const candidate = attributes.find((attribute) => {
    const normalizedKey = String(attribute && attribute.key ? attribute.key : "").toLowerCase();
    if (!normalizedKey) {
      return false;
    }
    return normalizedKeys.some((key) => normalizedKey.includes(key));
  });

  if (!candidate) {
    return fallbackValue;
  }

  const value = normalizeText(candidate.value, "");
  return value || fallbackValue;
}

function extractVehicleListContext(vehicleDetail) {
  if (!vehicleDetail) {
    return {
      regional: "N/D",
      district: "N/D",
      brand: "",
      model: "",
    };
  }

  const attributes = Array.isArray(vehicleDetail.attributes) ? vehicleDetail.attributes : [];

  const regional = resolveContextValue(vehicleDetail, attributes, [
    "regional",
    "region",
    "zona",
  ]);
  const district = resolveContextValue(vehicleDetail, attributes, [
    "distrito",
    "district",
    "sector",
  ]);
  const brand = resolveContextValue(vehicleDetail, attributes, [
    "marcaNombre",
    "marca_nombre",
    "marca",
    "brand",
  ]);
  const model = resolveContextValue(vehicleDetail, attributes, [
    "modeloNombre",
    "modelo_nombre",
    "modelo",
    "model",
  ]);

  return {
    regional: normalizeText(regional, "N/D"),
    district: normalizeText(district, "N/D"),
    brand: normalizeText(brand, ""),
    model: normalizeText(model, ""),
  };
}

function buildBrandLabel(detailContext, fallbackType) {
  const brand = normalizeText(detailContext && detailContext.brand, "");

  if (brand) {
    return brand;
  }

  const fallback = normalizeText(fallbackType, "N/D");
  if (fallback === "N/D") {
    return fallback;
  }

  return normalizeBrandLabel(fallback);
}

function normalizeBrandLabel(value) {
  const normalized = normalizeText(value, "N/D");
  if (normalized === "N/D") {
    return normalized;
  }

  if (normalized.includes("/")) {
    return normalizeText(normalized.split("/")[0], normalized);
  }

  return normalized;
}

function resolveContextValue(vehicleDetail, attributes, keys) {
  for (const key of keys) {
    const directValue = normalizeDisplayValue(vehicleDetail && vehicleDetail[key]);
    if (directValue) {
      return directValue;
    }
  }

  const normalizedKeys = keys.map((key) => String(key || "").toLowerCase());

  const exactMatch = attributes.find((attribute) => {
    const attributeKey = String(attribute && attribute.key ? attribute.key : "").toLowerCase();
    return attributeKey && normalizedKeys.includes(attributeKey);
  });
  if (exactMatch) {
    const exactValue = normalizeDisplayValue(exactMatch.value);
    if (exactValue) {
      return exactValue;
    }
  }

  const looseMatch = attributes.find((attribute) => {
    const attributeKey = String(attribute && attribute.key ? attribute.key : "").toLowerCase();
    if (!attributeKey) {
      return false;
    }
    return normalizedKeys.some((key) => attributeKey.includes(key));
  });

  if (!looseMatch) {
    return "";
  }

  return normalizeDisplayValue(looseMatch.value);
}

function normalizeDisplayValue(value) {
  const normalized = normalizeText(value, "");
  if (!normalized) {
    return "";
  }

  const mappedValueMatch = normalized.match(/^\d+\s*\((.*)\)$/);
  if (mappedValueMatch && mappedValueMatch[1]) {
    return normalizeText(mappedValueMatch[1], normalized);
  }

  return normalized;
}

function collectDistinctValues(values, excludedValues = []) {
  const exclusionSet = new Set(
    (excludedValues || []).map((value) => normalizeText(value, "").toUpperCase())
  );

  return [...new Set((values || []).map((value) => normalizeText(value, "")).filter(Boolean))]
    .filter((value) => !exclusionSet.has(value.toUpperCase()))
    .sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
}

function normalizeText(value, fallbackValue = "") {
  if (value === null || value === undefined) {
    return fallbackValue;
  }
  const normalized = String(value).trim();
  if (!normalized) {
    return fallbackValue;
  }
  if (normalized.toUpperCase() === "N/A") {
    return fallbackValue;
  }
  return normalized;
}
