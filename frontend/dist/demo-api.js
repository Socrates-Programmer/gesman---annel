(function () {
  if (window.__GESMAN_DEMO_API__) {
    return;
  }
  window.__GESMAN_DEMO_API__ = true;

  var DEMO_USER = "mini";
  var DEMO_PASS = "mini123";
  var DEMO_SESSION_KEY = "gesman_demo_session_v1";
  var ORDERS_STORAGE_KEY = "gesman_work_orders_v1";

  var STATUS_OPTIONS = [
    { id: 1, name: "Pendiente" },
    { id: 2, name: "En proceso" },
    { id: 3, name: "Resuelta" },
  ];
  var PRIORITY_OPTIONS = [
    { id: 1, name: "Baja", level: 1 },
    { id: 2, name: "Media", level: 2 },
    { id: 3, name: "Alta", level: 3 },
  ];
  var TYPE_OPTIONS = [
    { id: 1, name: "Sistema de frenos", categoryId: 1, categoryName: "Mecanica" },
    { id: 2, name: "Motor", categoryId: 1, categoryName: "Mecanica" },
    { id: 3, name: "Sistema electrico", categoryId: 2, categoryName: "Electrica" },
    { id: 4, name: "Neumaticos", categoryId: 3, categoryName: "Llantas" },
  ];
  var CATEGORY_OPTIONS = [
    { id: 1, name: "Mecanica" },
    { id: 2, name: "Electrica" },
    { id: 3, name: "Llantas" },
  ];

  var VEHICLE_ROWS = [
    {
      id: "301",
      code: "BUS-1033",
      type: "ZG6120",
      brand: "Yutong",
      plate: "L450001",
      chassis: "CH-1033",
      districtId: 101,
      districtName: "Distrito 10-01",
      regionalId: 10,
      regionalName: "Regional 10",
      status: "Operativo",
      statusClass: "vehicle-active",
    },
    {
      id: "302",
      code: "BUS-1041",
      type: "XMQ6106",
      brand: "King Long",
      plate: "L450002",
      chassis: "CH-1041",
      districtId: 102,
      districtName: "Distrito 10-02",
      regionalId: 10,
      regionalName: "Regional 10",
      status: "En mantenimiento",
      statusClass: "vehicle-maintenance",
    },
    {
      id: "303",
      code: "BUS-1058",
      type: "A9",
      brand: "Volvo",
      plate: "L450003",
      chassis: "CH-1058",
      districtId: 801,
      districtName: "Distrito 08-01",
      regionalId: 8,
      regionalName: "Regional 08",
      status: "Fuera de servicio",
      statusClass: "vehicle-inactive",
    },
    {
      id: "304",
      code: "BUS-1012",
      type: "HFF6110",
      brand: "Higer",
      plate: "L450004",
      chassis: "CH-1012",
      districtId: 1501,
      districtName: "Distrito 15-01",
      regionalId: 15,
      regionalName: "Regional 15",
      status: "Operativo",
      statusClass: "vehicle-active",
    },
    {
      id: "305",
      code: "BUS-1061",
      type: "B12R",
      brand: "Volvo",
      plate: "L450005",
      chassis: "CH-1061",
      districtId: 401,
      districtName: "Distrito 04-01",
      regionalId: 4,
      regionalName: "Regional 04",
      status: "Operativo",
      statusClass: "vehicle-active",
    },
    {
      id: "306",
      code: "BUS-1043",
      type: "XMQ6127",
      brand: "King Long",
      plate: "L450006",
      chassis: "CH-1043",
      districtId: 601,
      districtName: "Distrito 06-01",
      regionalId: 6,
      regionalName: "Regional 06",
      status: "En mantenimiento",
      statusClass: "vehicle-maintenance",
    },
  ];

  function toIso(daysOffset, hour) {
    var date = new Date();
    date.setDate(date.getDate() + daysOffset);
    date.setHours(typeof hour === "number" ? hour : 9, 20, 0, 0);
    return date.toISOString();
  }

  var state = {
    incidents: [
      {
        id: 1001,
        code: "#1001",
        vehicleId: 301,
        vehicleLabel: "BUS-1033",
        typeId: 1,
        typeLabel: "Sistema de frenos",
        priorityId: 3,
        priorityLabel: "Alta",
        priorityLevel: 3,
        statusId: 1,
        statusLabel: "Pendiente",
        statusClass: "pending",
        description: "Ruido y vibracion al frenar en ruta urbana.",
        createdByUserId: 1,
        createdAt: toIso(-2, 8),
        closedAt: null,
      },
      {
        id: 1002,
        code: "#1002",
        vehicleId: 302,
        vehicleLabel: "BUS-1041",
        typeId: 2,
        typeLabel: "Motor",
        priorityId: 2,
        priorityLabel: "Media",
        priorityLevel: 2,
        statusId: 2,
        statusLabel: "En proceso",
        statusClass: "progress",
        description: "Sobrecalentamiento luego de 40 minutos de operacion.",
        createdByUserId: 1,
        createdAt: toIso(-1, 10),
        closedAt: null,
      },
      {
        id: 1003,
        code: "#1003",
        vehicleId: 303,
        vehicleLabel: "BUS-1058",
        typeId: 3,
        typeLabel: "Sistema electrico",
        priorityId: 3,
        priorityLabel: "Alta",
        priorityLevel: 3,
        statusId: 2,
        statusLabel: "En proceso",
        statusClass: "progress",
        description: "Sin encendido al iniciar turno matutino.",
        createdByUserId: 1,
        createdAt: toIso(-4, 7),
        closedAt: null,
      },
      {
        id: 1004,
        code: "#1004",
        vehicleId: 304,
        vehicleLabel: "BUS-1012",
        typeId: 4,
        typeLabel: "Neumaticos",
        priorityId: 1,
        priorityLabel: "Baja",
        priorityLevel: 1,
        statusId: 3,
        statusLabel: "Resuelta",
        statusClass: "resolved",
        description: "Desgaste irregular detectado en rueda trasera.",
        createdByUserId: 1,
        createdAt: toIso(-7, 12),
        closedAt: toIso(-6, 14),
      },
      {
        id: 1005,
        code: "#1005",
        vehicleId: 305,
        vehicleLabel: "BUS-1061",
        typeId: 2,
        typeLabel: "Motor",
        priorityId: 2,
        priorityLabel: "Media",
        priorityLevel: 2,
        statusId: 1,
        statusLabel: "Pendiente",
        statusClass: "pending",
        description: "Perdida de potencia en pendientes pronunciadas.",
        createdByUserId: 1,
        createdAt: toIso(-3, 9),
        closedAt: null,
      },
      {
        id: 1006,
        code: "#1006",
        vehicleId: 306,
        vehicleLabel: "BUS-1043",
        typeId: 1,
        typeLabel: "Sistema de frenos",
        priorityId: 1,
        priorityLabel: "Baja",
        priorityLevel: 1,
        statusId: 3,
        statusLabel: "Resuelta",
        statusClass: "resolved",
        description: "Ajuste preventivo realizado en pastillas delanteras.",
        createdByUserId: 1,
        createdAt: toIso(-10, 10),
        closedAt: toIso(-9, 11),
      },
    ],
  };

  seedWorkOrders();

  function seedWorkOrders() {
    try {
      var existingRaw = window.localStorage.getItem(ORDERS_STORAGE_KEY);
      var existing = existingRaw ? JSON.parse(existingRaw) : [];
      if (Array.isArray(existing) && existing.length > 0) {
        return;
      }
      var seeded = [
        {
          id: 1,
          code: "OT-000001",
          incidentId: 1001,
          incidentCode: "#1001",
          busLabel: "BUS-1033",
          priorityLabel: "Alta",
          statusCode: "ASIGNADA",
          statusLabel: "Asignada",
          createdAt: toIso(-2, 9),
          updatedAt: toIso(-2, 11),
          closedAt: null,
          createdBy: "Encargado Mantenimiento",
          assignedMechanicId: 9001,
          assignedMechanicName: "Carlos Jimenez",
          assignmentMode: "AUTOMATICA",
          diagnosis: "Revisar pastillas y disco delantero.",
          progressNotes: [],
          tasks: [],
          requestedParts: false,
          requestedPartsNote: "",
          approvals: {
            maintenanceApprovedAt: null,
            maintenanceApprovedBy: null,
            operationsApprovedAt: null,
            operationsApprovedBy: null,
          },
          costs: { estimated: 2500, real: 0, currency: "DOP" },
          evidences: [],
        },
        {
          id: 2,
          code: "OT-000002",
          incidentId: 1002,
          incidentCode: "#1002",
          busLabel: "BUS-1041",
          priorityLabel: "Media",
          statusCode: "EN_REPARACION",
          statusLabel: "En reparacion",
          createdAt: toIso(-1, 8),
          updatedAt: toIso(-1, 14),
          closedAt: null,
          createdBy: "Encargado Mantenimiento",
          assignedMechanicId: 9002,
          assignedMechanicName: "Ramon Polanco",
          assignmentMode: "AUTOMATICA",
          diagnosis: "Termostato y nivel de refrigerante bajo.",
          progressNotes: [],
          tasks: [],
          requestedParts: true,
          requestedPartsNote: "Solicitar termostato compatible.",
          approvals: {
            maintenanceApprovedAt: null,
            maintenanceApprovedBy: null,
            operationsApprovedAt: null,
            operationsApprovedBy: null,
          },
          costs: { estimated: 4200, real: 1800, currency: "DOP" },
          evidences: [],
        },
      ];
      window.localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(seeded));
    } catch (_error) {
      // no-op
    }
  }

  function readDemoSession() {
    try {
      var raw = window.localStorage.getItem(DEMO_SESSION_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || parsed.isAuthenticated !== true) return null;
      return parsed;
    } catch (_error) {
      return null;
    }
  }

  function saveDemoSession(session) {
    try {
      window.localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(session));
    } catch (_error) {
      // no-op
    }
  }

  function clearDemoSession() {
    try {
      window.localStorage.removeItem(DEMO_SESSION_KEY);
    } catch (_error) {
      // no-op
    }
  }

  function jsonResponse(status, body) {
    return new Response(JSON.stringify(body), {
      status: status,
      headers: { "Content-Type": "application/json" },
    });
  }

  function parseJsonBody(init) {
    try {
      return init && init.body ? JSON.parse(init.body) : {};
    } catch (_error) {
      return {};
    }
  }

  function norm(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  function getStatusById(statusId) {
    return STATUS_OPTIONS.find(function (item) {
      return Number(item.id) === Number(statusId);
    }) || STATUS_OPTIONS[0];
  }
  function getPriorityById(priorityId) {
    return PRIORITY_OPTIONS.find(function (item) {
      return Number(item.id) === Number(priorityId);
    }) || PRIORITY_OPTIONS[1];
  }
  function getTypeById(typeId) {
    return TYPE_OPTIONS.find(function (item) {
      return Number(item.id) === Number(typeId);
    }) || TYPE_OPTIONS[0];
  }
  function getVehicleById(vehicleId) {
    return VEHICLE_ROWS.find(function (item) {
      return Number(item.id) === Number(vehicleId);
    }) || VEHICLE_ROWS[0];
  }

  function sortIncidents(rows) {
    return rows.slice().sort(function (a, b) {
      var ta = Date.parse(a.createdAt || "");
      var tb = Date.parse(b.createdAt || "");
      return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
    });
  }

  function buildCatalogPayload() {
    return {
      vehicles: VEHICLE_ROWS.map(function (row) {
        return {
          id: Number(row.id),
          label: row.code,
          districtId: row.districtId,
          districtName: row.districtName,
          regionalId: row.regionalId,
          regionalName: row.regionalName,
        };
      }),
      incidentTypes: TYPE_OPTIONS.map(function (item) {
        return {
          id: item.id,
          name: item.name,
          description: "",
          categoryId: item.categoryId,
          categoryName: item.categoryName,
        };
      }),
      priorities: PRIORITY_OPTIONS.map(function (item) {
        return { id: item.id, name: item.name, level: item.level };
      }),
      incidentStatuses: STATUS_OPTIONS.map(function (item) {
        return { id: item.id, name: item.name };
      }),
      incidentCategories: CATEGORY_OPTIONS.map(function (item) {
        return { id: item.id, name: item.name };
      }),
    };
  }

  function incidentsList(url) {
    var page = Math.max(1, Number.parseInt(url.searchParams.get("page") || "1", 10) || 1);
    var limit = Math.max(1, Number.parseInt(url.searchParams.get("limit") || "20", 10) || 20);
    var q = norm(url.searchParams.get("q") || "").toLowerCase();
    var statusId = norm(url.searchParams.get("estado_id") || "");
    var includeClosed = String(url.searchParams.get("includeClosed") || "").toLowerCase() === "true";

    var rows = sortIncidents(state.incidents);
    if (!includeClosed) rows = rows.filter(function (r) { return !r.closedAt; });
    if (statusId) rows = rows.filter(function (r) { return String(r.statusId) === statusId; });
    if (q) {
      rows = rows.filter(function (r) {
        return [r.code, r.description, r.vehicleLabel].some(function (value) {
          return String(value || "").toLowerCase().indexOf(q) >= 0;
        });
      });
    }

    var total = rows.length;
    var totalPages = Math.max(1, Math.ceil(total / limit));
    var safePage = Math.min(page, totalPages);
    var start = (safePage - 1) * limit;

    return jsonResponse(200, {
      data: rows.slice(start, start + limit),
      meta: {
        total: total,
        page: safePage,
        pageSize: limit,
        totalPages: totalPages,
        hasNextPage: safePage < totalPages,
        hasPrevPage: safePage > 1,
      },
    });
  }

  function incidentDetail(id) {
    var incident = state.incidents.find(function (row) { return Number(row.id) === Number(id); });
    if (!incident) {
      return jsonResponse(404, { error: { code: "NOT_FOUND", message: "La incidencia solicitada no existe." } });
    }
    return jsonResponse(200, { data: incident });
  }

  function vehicleDetailRow(row) {
    var statusOptions = [
      { id: 1, name: "Operativo" },
      { id: 2, name: "En mantenimiento" },
      { id: 3, name: "Fuera de servicio" },
    ];
    var statusId = row.status === "Operativo" ? 1 : row.status === "En mantenimiento" ? 2 : 3;
    return {
      id: Number(row.id),
      ficha: row.code,
      placa: row.plate,
      chasis: row.chassis,
      estadoId: statusId,
      estadoNombre: row.status,
      modeloId: null,
      modeloNombre: row.type,
      marcaNombre: row.brand,
      tipo: row.brand + " " + row.type,
      statusClass: row.statusClass,
      statusOptions: statusOptions,
      attributes: [
        { key: "regional", label: "Regional", value: row.regionalName },
        { key: "distrito", label: "Distrito", value: row.districtName },
        { key: "ruta", label: "Ruta", value: "Ruta urbana" },
      ],
    };
  }

  function vehiclesActive(url) {
    var page = Math.max(1, Number.parseInt(url.searchParams.get("page") || "1", 10) || 1);
    var limit = Math.max(1, Number.parseInt(url.searchParams.get("limit") || "10", 10) || 10);
    var brand = norm(url.searchParams.get("brand") || "");
    var regionalId = norm(url.searchParams.get("regionalId") || "");
    var districtId = norm(url.searchParams.get("districtId") || "");

    var filtered = VEHICLE_ROWS.slice();
    if (brand) filtered = filtered.filter(function (r) { return norm(r.brand) === brand || norm(r.type) === brand; });
    if (regionalId) filtered = filtered.filter(function (r) { return String(r.regionalId) === regionalId; });
    if (districtId) filtered = filtered.filter(function (r) { return String(r.districtId) === districtId; });

    var total = filtered.length;
    var totalPages = Math.max(1, Math.ceil(total / limit));
    var safePage = Math.min(page, totalPages);
    var start = (safePage - 1) * limit;
    var activeVehicles = filtered.filter(function (row) { return row.status === "Operativo"; }).length;

    return jsonResponse(200, {
      data: filtered.slice(start, start + limit),
      meta: {
        total: total,
        page: safePage,
        pageSize: limit,
        totalPages: totalPages,
        hasNextPage: safePage < totalPages,
        hasPrevPage: safePage > 1,
        summary: {
          totalVehicles: filtered.length,
          activeVehicles: activeVehicles,
          inactiveVehicles: filtered.length - activeVehicles,
        },
        availabilityByBrand: [],
        availabilityByRegional: [],
        availabilityByDistrict: [],
      },
    });
  }

  function dashboardSummary() {
    var openIncidents = state.incidents.filter(function (r) { return !r.closedAt; });
    var closedIncidents = state.incidents.filter(function (r) { return !!r.closedAt; });
    var activeVehicles = VEHICLE_ROWS.filter(function (row) { return row.status === "Operativo"; }).length;
    var statusDistribution = STATUS_OPTIONS.map(function (status) {
      return {
        id: status.id,
        label: status.name,
        value: openIncidents.filter(function (r) { return Number(r.statusId) === Number(status.id); }).length,
      };
    });
    var typeDistribution = TYPE_OPTIONS.map(function (type) {
      return {
        id: type.id,
        label: type.name,
        value: openIncidents.filter(function (r) { return Number(r.typeId) === Number(type.id); }).length,
      };
    });
    return jsonResponse(200, {
      data: {
        metrics: {
          openIncidents: openIncidents.length,
          closedIncidents: closedIncidents.length,
          activeVehicles: activeVehicles,
          inactiveVehicles: VEHICLE_ROWS.length - activeVehicles,
          totalVehicles: VEHICLE_ROWS.length,
        },
        statusDistribution: statusDistribution,
        typeDistribution: typeDistribution,
        recentIncidents: sortIncidents(openIncidents).slice(0, 8),
      },
    });
  }

  function isPath(pathname, endpoint) {
    return pathname === endpoint || pathname === endpoint + "/";
  }

  var originalFetch = typeof window.fetch === "function" ? window.fetch.bind(window) : null;
  window.fetch = function (input, init) {
    var safeInit = init || {};
    var inputUrl = typeof input === "string" ? input : input && input.url ? input.url : "";
    var method = String(safeInit.method || (input && input.method) || "GET").toUpperCase();
    var url;
    try {
      url = new URL(inputUrl || window.location.href, window.location.href);
    } catch (_error) {
      url = new URL(window.location.href);
    }
    var pathname = url.pathname;

    if (isPath(pathname, "/api/auth/session") && method === "GET") {
      var session = readDemoSession();
      return Promise.resolve(jsonResponse(200, { data: session || { isAuthenticated: false, username: null, userId: null } }));
    }
    if (isPath(pathname, "/api/auth/login") && method === "POST") {
      var loginBody = parseJsonBody(safeInit);
      if (norm(loginBody.username) === DEMO_USER && String(loginBody.password || "") === DEMO_PASS) {
        var nextSession = { isAuthenticated: true, username: DEMO_USER, userId: 1 };
        saveDemoSession(nextSession);
        return Promise.resolve(jsonResponse(200, { message: "Sesion iniciada correctamente.", data: nextSession }));
      }
      return Promise.resolve(jsonResponse(401, { error: { code: "INVALID_CREDENTIALS", message: "Credenciales invalidas." } }));
    }
    if (isPath(pathname, "/api/auth/logout") && method === "POST") {
      clearDemoSession();
      return Promise.resolve(jsonResponse(200, { message: "Sesion cerrada correctamente." }));
    }
    if (isPath(pathname, "/api/catalogs/incident-form") && method === "GET") {
      return Promise.resolve(jsonResponse(200, { data: buildCatalogPayload() }));
    }
    if (isPath(pathname, "/api/incidents") && method === "GET") {
      return Promise.resolve(incidentsList(url));
    }
    var incidentMatch = pathname.match(/^\/api\/incidents\/(\d+)\/?$/);
    if (incidentMatch && method === "GET") {
      return Promise.resolve(incidentDetail(incidentMatch[1]));
    }
    if (isPath(pathname, "/api/vehicles/active") && method === "GET") {
      return Promise.resolve(vehiclesActive(url));
    }
    var vehicleMatch = pathname.match(/^\/api\/vehicles\/(\d+)\/?$/);
    if (vehicleMatch && method === "GET") {
      var row = VEHICLE_ROWS.find(function (item) { return Number(item.id) === Number(vehicleMatch[1]); });
      if (!row) return Promise.resolve(jsonResponse(404, { error: { code: "NOT_FOUND", message: "Vehiculo no encontrado." } }));
      return Promise.resolve(jsonResponse(200, { data: vehicleDetailRow(row) }));
    }
    if (isPath(pathname, "/api/dashboard/summary") && method === "GET") {
      return Promise.resolve(dashboardSummary());
    }

    if (originalFetch) {
      return originalFetch(input, safeInit);
    }
    return Promise.resolve(jsonResponse(503, { error: { code: "NETWORK_UNAVAILABLE", message: "Sin backend disponible." } }));
  };
})();
