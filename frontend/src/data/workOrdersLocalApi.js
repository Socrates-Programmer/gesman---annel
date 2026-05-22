const STORAGE_KEYS = {
  orders: "gesman_work_orders_v1",
  auditLogs: "gesman_work_orders_audit_v1",
  notifications: "gesman_work_orders_notifications_v1",
  preventivePlans: "gesman_preventive_plans_v1",
  mechanics: "gesman_hrm_personal_v1",
};

const TERMINAL_ORDER_STATUS = new Set(["CERRADA", "RECHAZADA", "ANULADA"]);

export const ROLE_CATALOG = [
  { id: "ADMIN", label: "ADMIN" },
  { id: "GERENTE_DIRECTOR", label: "GERENTE / DIRECTOR" },
  { id: "SUPERVISOR_OPERACIONES", label: "SUPERVISOR_OPERACIONES" },
  { id: "ENCARGADO_MANTENIMIENTO", label: "ENCARGADO_MANTENIMIENTO" },
  { id: "MECANICO", label: "MECANICO" },
  { id: "ALMACEN", label: "ALMACEN" },
  { id: "VIEWER", label: "VIEWER" },
];

const ORDER_STATUS_LABELS = {
  CREADA: "Creada",
  ASIGNADA: "Asignada",
  EN_DIAGNOSTICO: "En diagnostico",
  EN_REPARACION: "En reparacion",
  EN_ESPERA_REPUESTOS: "En espera de repuestos",
  LISTA_REVISION: "Lista para revision",
  APROBADA_MANTENIMIENTO: "Aprobada por mantenimiento",
  APROBADA_OPERACIONES: "Aprobada por operaciones",
  CERRADA: "Cerrada",
  RECHAZADA: "Rechazada",
  ANULADA: "Anulada",
};

const DEFAULT_MECHANICS = [
  {
    id: 9001,
    code: "MEC-001",
    fullName: "Carlos Jimenez",
    available: true,
    active: true,
    lastAssignedAt: null,
  },
  {
    id: 9002,
    code: "MEC-002",
    fullName: "Ramon Polanco",
    available: true,
    active: true,
    lastAssignedAt: null,
  },
  {
    id: 9003,
    code: "MEC-003",
    fullName: "Miguel Cuevas",
    available: true,
    active: true,
    lastAssignedAt: null,
  },
  {
    id: 9004,
    code: "MEC-004",
    fullName: "Jose Mendez",
    available: false,
    active: true,
    lastAssignedAt: null,
  },
];

export function listWorkOrders() {
  return loadArray(STORAGE_KEYS.orders);
}

export function listAuditLogs(limit = 80) {
  return loadArray(STORAGE_KEYS.auditLogs).slice(0, limit);
}

export function listNotifications(limit = 60) {
  return loadArray(STORAGE_KEYS.notifications).slice(0, limit);
}

export function listPreventivePlans() {
  const plans = loadArray(STORAGE_KEYS.preventivePlans);
  return plans
    .map((plan) => ({
      ...plan,
      status: resolvePreventiveStatus(plan),
    }))
    .sort((a, b) => {
      const nextDateA = Date.parse(a.nextDate || "");
      const nextDateB = Date.parse(b.nextDate || "");
      const safeA = Number.isFinite(nextDateA) ? nextDateA : Number.MAX_SAFE_INTEGER;
      const safeB = Number.isFinite(nextDateB) ? nextDateB : Number.MAX_SAFE_INTEGER;
      return safeA - safeB;
    });
}

export function listMechanics() {
  const storedMechanics = loadArray(STORAGE_KEYS.mechanics);
  if (storedMechanics.length) {
    return storedMechanics.map(normalizeMechanic);
  }
  saveArray(STORAGE_KEYS.mechanics, DEFAULT_MECHANICS);
  return DEFAULT_MECHANICS.map(normalizeMechanic);
}

export function createWorkOrderFromIncident(incident, actor) {
  if (!incident || !incident.id) {
    throw new Error("Debes seleccionar una incidencia valida para crear la orden.");
  }

  const orders = listWorkOrders();
  const duplicated = orders.find(
    (order) => Number(order.incidentId) === Number(incident.id) && !TERMINAL_ORDER_STATUS.has(order.statusCode)
  );
  if (duplicated) {
    throw new Error(`La incidencia ${duplicated.incidentCode} ya tiene una orden activa (${duplicated.code}).`);
  }

  const now = new Date().toISOString();
  const mechanics = listMechanics();
  const assignedMechanic = pickAutomaticMechanic(mechanics, orders);
  const nextId = resolveNextNumericId(orders);

  const order = {
    id: nextId,
    code: `OT-${String(nextId).padStart(6, "0")}`,
    incidentId: Number(incident.id),
    incidentCode: incident.code || `#${incident.id}`,
    busLabel: incident.vehicleLabel || "N/A",
    priorityLabel: incident.priorityLabel || "N/A",
    statusCode: assignedMechanic ? "ASIGNADA" : "CREADA",
    statusLabel: assignedMechanic ? ORDER_STATUS_LABELS.ASIGNADA : ORDER_STATUS_LABELS.CREADA,
    createdAt: now,
    updatedAt: now,
    closedAt: null,
    createdBy: resolveActorName(actor),
    assignedMechanicId: assignedMechanic ? Number(assignedMechanic.id) : null,
    assignedMechanicName: assignedMechanic ? assignedMechanic.fullName : "Pendiente de asignacion",
    assignmentMode: assignedMechanic ? "AUTOMATICA" : "MANUAL_PENDIENTE",
    diagnosis: "",
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
    costs: {
      estimated: 0,
      real: 0,
      currency: "DOP",
    },
    evidences: [],
  };

  orders.unshift(order);
  saveArray(STORAGE_KEYS.orders, orders);

  if (assignedMechanic) {
    saveMechanicAssignment(assignedMechanic.id, now);
  }

  appendAuditLog({
    action: "ORDER_CREATED",
    actor,
    entityType: "WORK_ORDER",
    entityId: order.id,
    details: `Orden ${order.code} creada desde incidencia ${order.incidentCode}.`,
  });
  appendNotification({
    channel: "SISTEMA",
    status: "ENVIADA",
    entityType: "WORK_ORDER",
    entityId: order.id,
    message: `Orden ${order.code} creada.`,
  });
  appendNotification({
    channel: "CORREO",
    status: "PENDIENTE",
    provider: "SMTP_LOCAL",
    entityType: "WORK_ORDER",
    entityId: order.id,
    message: `Notificar creacion de ${order.code}.`,
  });

  return order;
}

export function reassignWorkOrder(orderId, mechanicId, actor) {
  return mutateOrder(
    orderId,
    (order) => {
      const mechanics = listMechanics();
      const selectedMechanic = mechanics.find((item) => Number(item.id) === Number(mechanicId));
      if (!selectedMechanic) {
        throw new Error("El mecanico seleccionado no existe.");
      }

      order.assignedMechanicId = Number(selectedMechanic.id);
      order.assignedMechanicName = selectedMechanic.fullName;
      order.assignmentMode = "MANUAL";
      if (order.statusCode === "CREADA") {
        setOrderStatus(order, "ASIGNADA");
      }

      saveMechanicAssignment(selectedMechanic.id, new Date().toISOString());
    },
    {
      action: "ORDER_REASSIGNED",
      actor,
      details: "Se actualizo la asignacion de mecanico.",
    }
  );
}

export function saveOrderDiagnosis(orderId, diagnosis, actor) {
  return mutateOrder(
    orderId,
    (order) => {
      const safeDiagnosis = String(diagnosis || "").trim();
      if (!safeDiagnosis) {
        throw new Error("El diagnostico no puede estar vacio.");
      }
      order.diagnosis = safeDiagnosis;
      if (order.statusCode === "CREADA" || order.statusCode === "ASIGNADA") {
        setOrderStatus(order, "EN_DIAGNOSTICO");
      }
    },
    {
      action: "ORDER_DIAGNOSIS_UPDATED",
      actor,
      details: "Se registro diagnostico tecnico.",
    }
  );
}

export function addOrderProgress(orderId, note, actor) {
  return mutateOrder(
    orderId,
    (order) => {
      const safeNote = String(note || "").trim();
      if (!safeNote) {
        throw new Error("Debes indicar un avance.");
      }
      order.progressNotes = Array.isArray(order.progressNotes) ? order.progressNotes : [];
      order.progressNotes.unshift({
        id: resolveNextNumericId(order.progressNotes),
        note: safeNote,
        createdAt: new Date().toISOString(),
        createdBy: resolveActorName(actor),
      });
      if (order.statusCode === "EN_DIAGNOSTICO" || order.statusCode === "ASIGNADA") {
        setOrderStatus(order, "EN_REPARACION");
      }
    },
    {
      action: "ORDER_PROGRESS_ADDED",
      actor,
      details: "Se agrego un avance de reparacion.",
    }
  );
}

export function addOrderTask(orderId, description, actor) {
  return mutateOrder(
    orderId,
    (order) => {
      const safeDescription = String(description || "").trim();
      if (!safeDescription) {
        throw new Error("La tarea no puede estar vacia.");
      }
      order.tasks = Array.isArray(order.tasks) ? order.tasks : [];
      order.tasks.push({
        id: resolveNextNumericId(order.tasks),
        description: safeDescription,
        completed: false,
        completedAt: null,
        completedBy: null,
        createdAt: new Date().toISOString(),
        createdBy: resolveActorName(actor),
      });
      if (order.statusCode === "ASIGNADA" || order.statusCode === "EN_DIAGNOSTICO") {
        setOrderStatus(order, "EN_REPARACION");
      }
    },
    {
      action: "ORDER_TASK_ADDED",
      actor,
      details: "Se agrego una tarea interna a la orden.",
    }
  );
}

export function toggleOrderTask(orderId, taskId, completed, actor) {
  return mutateOrder(
    orderId,
    (order) => {
      const tasks = Array.isArray(order.tasks) ? order.tasks : [];
      const task = tasks.find((item) => Number(item.id) === Number(taskId));
      if (!task) {
        throw new Error("La tarea indicada no existe.");
      }
      task.completed = Boolean(completed);
      task.completedAt = task.completed ? new Date().toISOString() : null;
      task.completedBy = task.completed ? resolveActorName(actor) : null;
    },
    {
      action: "ORDER_TASK_UPDATED",
      actor,
      details: "Se actualizo el estado de una tarea interna.",
    }
  );
}

export function setOrderPartsRequest(orderId, enabled, note, actor) {
  return mutateOrder(
    orderId,
    (order) => {
      order.requestedParts = Boolean(enabled);
      order.requestedPartsNote = String(note || "").trim();
      if (order.requestedParts) {
        setOrderStatus(order, "EN_ESPERA_REPUESTOS");
      } else if (order.statusCode === "EN_ESPERA_REPUESTOS") {
        setOrderStatus(order, "EN_REPARACION");
      }
    },
    {
      action: "ORDER_PARTS_REQUEST_UPDATED",
      actor,
      details: enabled ? "Orden marcada en espera de repuestos." : "Orden reactivada sin espera de repuestos.",
    }
  );
}

export function markOrderReadyForReview(orderId, actor) {
  return mutateOrder(
    orderId,
    (order) => {
      const pendingTasks = (order.tasks || []).filter((task) => !task.completed);
      if (pendingTasks.length > 0) {
        throw new Error("No puedes enviar a revision mientras existan tareas pendientes.");
      }
      setOrderStatus(order, "LISTA_REVISION");
    },
    {
      action: "ORDER_READY_FOR_REVIEW",
      actor,
      details: "Orden marcada como lista para revision.",
    }
  );
}

export function approveOrderByMaintenance(orderId, actor) {
  return mutateOrder(
    orderId,
    (order) => {
      if (order.statusCode !== "LISTA_REVISION" && order.statusCode !== "APROBADA_MANTENIMIENTO") {
        throw new Error("La orden debe estar en lista para revision.");
      }
      order.approvals.maintenanceApprovedAt = new Date().toISOString();
      order.approvals.maintenanceApprovedBy = resolveActorName(actor);
      setOrderStatus(order, "APROBADA_MANTENIMIENTO");
    },
    {
      action: "ORDER_APPROVED_MAINTENANCE",
      actor,
      details: "Aprobacion tecnica completada.",
    }
  );
}

export function approveOrderByOperations(orderId, actor) {
  return mutateOrder(
    orderId,
    (order) => {
      if (!order.approvals || !order.approvals.maintenanceApprovedAt) {
        throw new Error("Primero se requiere aprobacion de mantenimiento.");
      }
      order.approvals.operationsApprovedAt = new Date().toISOString();
      order.approvals.operationsApprovedBy = resolveActorName(actor);
      setOrderStatus(order, "APROBADA_OPERACIONES");
      setOrderStatus(order, "CERRADA");
      order.closedAt = new Date().toISOString();
    },
    {
      action: "ORDER_APPROVED_OPERATIONS",
      actor,
      details: "Aprobacion de operaciones completada. Orden cerrada.",
    }
  );
}

export function updateOrderCosts(orderId, { estimated, real }, actor) {
  return mutateOrder(
    orderId,
    (order) => {
      const safeEstimated = normalizeCurrencyValue(estimated);
      const safeReal = normalizeCurrencyValue(real);
      order.costs = {
        estimated: safeEstimated,
        real: safeReal,
        currency: "DOP",
      };
    },
    {
      action: "ORDER_COSTS_UPDATED",
      actor,
      details: "Costos estimados y reales actualizados.",
    }
  );
}

export function addOrderEvidence(orderId, payload, actor) {
  return mutateOrder(
    orderId,
    (order) => {
      const fileName = String(payload && payload.fileName ? payload.fileName : "").trim();
      if (!fileName) {
        throw new Error("Debes indicar al menos el nombre del archivo.");
      }
      const mimeType = String(payload && payload.mimeType ? payload.mimeType : "application/octet-stream").trim();
      const rawSize = Number.parseInt(String(payload && payload.sizeBytes ? payload.sizeBytes : "0"), 10);
      const sizeBytes = Number.isFinite(rawSize) && rawSize > 0 ? rawSize : 0;

      order.evidences = Array.isArray(order.evidences) ? order.evidences : [];
      order.evidences.unshift({
        id: resolveNextNumericId(order.evidences),
        fileName,
        storedName: `${Date.now()}_${sanitizeFileName(fileName)}`,
        relativePath: `/app/uploads/mantenimiento/${sanitizeFileName(fileName)}`,
        mimeType,
        sizeBytes,
        linkedEntityType: "WORK_ORDER",
        linkedEntityId: Number(order.id),
        uploadedBy: resolveActorName(actor),
        uploadedAt: new Date().toISOString(),
        status: "ACTIVO",
      });
    },
    {
      action: "ORDER_EVIDENCE_ADDED",
      actor,
      details: "Se agrego metadata de evidencia.",
    }
  );
}

export function upsertPreventivePlan(payload, actor) {
  const busId = Number.parseInt(String(payload && payload.busId ? payload.busId : ""), 10);
  const busLabel = String(payload && payload.busLabel ? payload.busLabel : "").trim();
  if (!Number.isFinite(busId) || busId < 1 || !busLabel) {
    throw new Error("Debes seleccionar un bus valido.");
  }

  const intervalDays = normalizePositiveInteger(payload.intervalDays, 90);
  const intervalKm = normalizePositiveInteger(payload.intervalKm, 5000);
  const lastMileage = normalizePositiveInteger(payload.lastMileage, 0);
  const lastMaintenanceDate = normalizeIsoDate(payload.lastMaintenanceDate, new Date().toISOString().slice(0, 10));

  const nextDate = addDaysToIsoDate(lastMaintenanceDate, intervalDays);
  const nextKm = lastMileage + intervalKm;

  const plans = loadArray(STORAGE_KEYS.preventivePlans);
  const existingIndex = plans.findIndex((item) => Number(item.busId) === busId);
  const now = new Date().toISOString();

  const planRecord = {
    id: existingIndex >= 0 ? plans[existingIndex].id : resolveNextNumericId(plans),
    busId,
    busLabel,
    intervalDays,
    intervalKm,
    lastMileage,
    lastMaintenanceDate,
    nextDate,
    nextKm,
    updatedAt: now,
    updatedBy: resolveActorName(actor),
  };

  if (existingIndex >= 0) {
    plans[existingIndex] = planRecord;
  } else {
    plans.push(planRecord);
  }

  saveArray(STORAGE_KEYS.preventivePlans, plans);
  appendAuditLog({
    action: existingIndex >= 0 ? "PREVENTIVE_PLAN_UPDATED" : "PREVENTIVE_PLAN_CREATED",
    actor,
    entityType: "PREVENTIVE_PLAN",
    entityId: planRecord.id,
    details: `Plan preventivo ${existingIndex >= 0 ? "actualizado" : "creado"} para ${busLabel}.`,
  });

  return planRecord;
}

export function listInternalAlerts() {
  const orders = listWorkOrders();
  const preventivePlans = listPreventivePlans();
  const alerts = [];

  orders.forEach((order) => {
    if (order.requestedParts && order.statusCode === "EN_ESPERA_REPUESTOS") {
      alerts.push({
        id: `parts-${order.id}`,
        severity: "warning",
        title: "Orden en espera de repuestos",
        message: `${order.code} requiere repuestos para continuar.`,
      });
    }

    if (order.statusCode === "LISTA_REVISION") {
      alerts.push({
        id: `review-${order.id}`,
        severity: "info",
        title: "Orden lista para revision",
        message: `${order.code} espera aprobacion de mantenimiento.`,
      });
    }
  });

  preventivePlans.forEach((plan) => {
    if (plan.status.code === "VENCIDO") {
      alerts.push({
        id: `preventive-overdue-${plan.id}`,
        severity: "warning",
        title: "Mantenimiento preventivo vencido",
        message: `${plan.busLabel} tiene mantenimiento vencido.`,
      });
    }
  });

  return alerts;
}

function mutateOrder(orderId, mutationFn, auditPayload) {
  const orders = listWorkOrders();
  const orderIndex = orders.findIndex((item) => Number(item.id) === Number(orderId));
  if (orderIndex < 0) {
    throw new Error("La orden indicada no existe.");
  }

  const nextOrder = {
    ...orders[orderIndex],
    tasks: Array.isArray(orders[orderIndex].tasks) ? [...orders[orderIndex].tasks] : [],
    progressNotes: Array.isArray(orders[orderIndex].progressNotes) ? [...orders[orderIndex].progressNotes] : [],
    evidences: Array.isArray(orders[orderIndex].evidences) ? [...orders[orderIndex].evidences] : [],
    approvals: {
      ...(orders[orderIndex].approvals || {}),
    },
    costs: {
      ...(orders[orderIndex].costs || {}),
    },
  };

  mutationFn(nextOrder);
  nextOrder.updatedAt = new Date().toISOString();
  orders[orderIndex] = nextOrder;
  saveArray(STORAGE_KEYS.orders, orders);

  if (auditPayload) {
    appendAuditLog({
      action: auditPayload.action,
      actor: auditPayload.actor,
      entityType: "WORK_ORDER",
      entityId: nextOrder.id,
      details: auditPayload.details || "",
    });
  }

  return nextOrder;
}

function setOrderStatus(order, statusCode) {
  const statusLabel = ORDER_STATUS_LABELS[statusCode];
  if (!statusLabel) {
    return;
  }
  order.statusCode = statusCode;
  order.statusLabel = statusLabel;
}

function resolveNextNumericId(list) {
  if (!Array.isArray(list) || list.length === 0) {
    return 1;
  }
  return (
    list.reduce((maxValue, item) => {
      const value = Number(item && item.id ? item.id : 0);
      return Number.isFinite(value) && value > maxValue ? value : maxValue;
    }, 0) + 1
  );
}

function pickAutomaticMechanic(mechanics, orders) {
  const candidates = (mechanics || [])
    .map(normalizeMechanic)
    .filter((mechanic) => mechanic.active && mechanic.available);

  if (!candidates.length) {
    return null;
  }

  const openCountByMechanic = new Map();
  (orders || [])
    .filter((order) => !TERMINAL_ORDER_STATUS.has(order.statusCode))
    .forEach((order) => {
      const key = Number(order.assignedMechanicId || 0);
      openCountByMechanic.set(key, (openCountByMechanic.get(key) || 0) + 1);
    });

  const sortedCandidates = [...candidates].sort((a, b) => {
    const loadA = openCountByMechanic.get(Number(a.id)) || 0;
    const loadB = openCountByMechanic.get(Number(b.id)) || 0;
    if (loadA !== loadB) {
      return loadA - loadB;
    }

    const lastAssignedAtA = Date.parse(a.lastAssignedAt || "");
    const lastAssignedAtB = Date.parse(b.lastAssignedAt || "");
    const safeA = Number.isFinite(lastAssignedAtA) ? lastAssignedAtA : 0;
    const safeB = Number.isFinite(lastAssignedAtB) ? lastAssignedAtB : 0;
    if (safeA !== safeB) {
      return safeA - safeB;
    }

    return Number(a.id) - Number(b.id);
  });

  return sortedCandidates[0] || null;
}

function saveMechanicAssignment(mechanicId, assignedAtIso) {
  const mechanics = listMechanics();
  const updated = mechanics.map((mechanic) => {
    if (Number(mechanic.id) !== Number(mechanicId)) {
      return mechanic;
    }
    return {
      ...mechanic,
      lastAssignedAt: assignedAtIso,
    };
  });
  saveArray(STORAGE_KEYS.mechanics, updated);
}

function appendAuditLog(payload) {
  const logs = loadArray(STORAGE_KEYS.auditLogs);
  const nextLog = {
    id: resolveNextNumericId(logs),
    at: new Date().toISOString(),
    action: payload.action || "UNSPECIFIED_ACTION",
    actor: resolveActorName(payload.actor),
    entityType: payload.entityType || "N/A",
    entityId: payload.entityId == null ? null : Number(payload.entityId),
    details: String(payload.details || "").trim(),
  };
  logs.unshift(nextLog);
  saveArray(STORAGE_KEYS.auditLogs, logs.slice(0, 300));
}

function appendNotification(payload) {
  const notifications = loadArray(STORAGE_KEYS.notifications);
  notifications.unshift({
    id: resolveNextNumericId(notifications),
    createdAt: new Date().toISOString(),
    channel: payload.channel || "SISTEMA",
    status: payload.status || "PENDIENTE",
    provider: payload.provider || "",
    entityType: payload.entityType || "N/A",
    entityId: payload.entityId == null ? null : Number(payload.entityId),
    message: String(payload.message || "").trim(),
  });
  saveArray(STORAGE_KEYS.notifications, notifications.slice(0, 300));
}

function resolvePreventiveStatus(plan) {
  const now = new Date();
  const nextDate = new Date(plan.nextDate || "");
  const dateDiffMs = Number.isFinite(nextDate.getTime()) ? nextDate.getTime() - now.getTime() : Number.MAX_SAFE_INTEGER;
  const daysRemaining = Math.floor(dateDiffMs / (24 * 60 * 60 * 1000));

  if (daysRemaining < 0) {
    return {
      code: "VENCIDO",
      label: "Vencido",
      tone: "warning",
      daysRemaining,
    };
  }

  if (daysRemaining <= 7) {
    return {
      code: "PROXIMO",
      label: "Proximo a vencer",
      tone: "info",
      daysRemaining,
    };
  }

  return {
    code: "AL_DIA",
    label: "Al dia",
    tone: "success",
    daysRemaining,
  };
}

function resolveActorName(actor) {
  if (!actor) {
    return "Sistema";
  }
  if (typeof actor === "string") {
    const value = actor.trim();
    return value || "Sistema";
  }
  const value = String(actor.name || actor.username || actor.role || "").trim();
  return value || "Sistema";
}

function normalizeMechanic(mechanic) {
  return {
    id: Number(mechanic && mechanic.id ? mechanic.id : 0),
    code: String(mechanic && mechanic.code ? mechanic.code : "").trim(),
    fullName: String(mechanic && mechanic.fullName ? mechanic.fullName : "Mecanico sin nombre").trim(),
    available: Boolean(mechanic && mechanic.available),
    active: mechanic && mechanic.active != null ? Boolean(mechanic.active) : true,
    lastAssignedAt: mechanic && mechanic.lastAssignedAt ? String(mechanic.lastAssignedAt) : null,
  };
}

function normalizeCurrencyValue(value) {
  const parsed = Number.parseFloat(String(value || "0").replace(",", "."));
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }
  return Math.round(parsed * 100) / 100;
}

function normalizePositiveInteger(value, defaultValue) {
  const parsed = Number.parseInt(String(value || ""), 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return defaultValue;
  }
  return parsed;
}

function normalizeIsoDate(value, fallback) {
  const candidate = String(value || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(candidate)) {
    return candidate;
  }
  return fallback;
}

function addDaysToIsoDate(isoDate, days) {
  const baseDate = new Date(`${isoDate}T00:00:00`);
  if (!Number.isFinite(baseDate.getTime())) {
    return isoDate;
  }
  baseDate.setDate(baseDate.getDate() + normalizePositiveInteger(days, 0));
  return baseDate.toISOString().slice(0, 10);
}

function sanitizeFileName(value) {
  return String(value || "")
    .trim()
    .replace(/[^A-Za-z0-9_.-]/g, "_")
    .replace(/_+/g, "_");
}

function loadArray(storageKey) {
  if (typeof window === "undefined" || !window.localStorage) {
    return [];
  }

  try {
    const serialized = window.localStorage.getItem(storageKey);
    if (!serialized) {
      return [];
    }
    const parsed = JSON.parse(serialized);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function saveArray(storageKey, value) {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }

  const safeValue = Array.isArray(value) ? value : [];
  window.localStorage.setItem(storageKey, JSON.stringify(safeValue));
}
