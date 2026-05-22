export const NAV_LINKS = [
  { id: "dashboard", label: "Dashboard", path: "/dashboard" },
  { id: "buses", label: "Buses", path: "/vehiculo" },
  { id: "incidencias", label: "Incidencias", path: "/incidencias" },
  { id: "ordenes", label: "Ordenes de trabajo", path: "/ordenes-trabajo" },
  { id: "mantenimiento", label: "Mantenimiento", path: "/mantenimiento" },
  { id: "reportes", label: "Reportes", path: "/reportes" },
  { id: "documentos", label: "Documentos" },
  { id: "configuracion", label: "Configuracion" },
];

export const METRIC_ITEMS = [
  { id: "open", title: "Incidencias Abiertas", value: "8", tone: "gold" },
  { id: "route", title: "Vehiculos en Ruta", value: "24", tone: "blue" },
  { id: "maintenance", title: "Mantenimiento Pendiente", value: "5", tone: "gold" },
  { id: "assist", title: "Asistencia en Camino", value: "3", tone: "blue" },
];

export const LEGEND_ITEMS = [
  { id: "averias", label: "Averias", percent: "35%", dotClass: "dot-blue" },
  { id: "accidentes", label: "Accidentes", percent: "25%", dotClass: "dot-orange" },
  { id: "fallas", label: "Fallas", percent: "20%", dotClass: "dot-gold" },
  { id: "otros", label: "Otros", percent: "20%", dotClass: "dot-slate" },
];

export const RECENT_REPORTS = [
  { id: "rep-1", status: "warning", text: "Falla de motor - Camion 102" },
  { id: "rep-2", status: "danger", text: "Accidente en Ruta 5 - Auto 250" },
  { id: "rep-3", status: "success", text: "Bateria descargada - Van 18" },
];

export const INCIDENT_ROWS = [
  {
    id: "#1023",
    description: "Motor no enciende",
    status: "En Proceso",
    statusClass: "progress",
    location: "Zona Centro",
    action: "view",
  },
  {
    id: "#1018",
    description: "Choque leve",
    status: "Pendiente",
    statusClass: "pending",
    location: "Ruta 8 - KM 45",
    action: "view",
  },
  {
    id: "#1015",
    description: "Sin combustible",
    status: "Resuelto",
    statusClass: "resolved",
    location: "Autopista Sur",
    action: "assign",
  },
];

export const REPORT_FORM_OPTIONS = {
  incidentType: ["Averia Mecanica", "Accidente", "Falla Electrica"],
  vehicle: ["Camion 102", "Van 18", "Auto 250"],
  location: ["Ruta 5, Km 120", "Zona Centro", "Autopista Sur"],
};

export const REPORT_MODULE_STATS = [
  { id: "pending", label: "Pendientes de Revision", value: "7" },
  { id: "critical", label: "Criticas en Cola", value: "3" },
  { id: "avg", label: "Promedio Registro", value: "4m" },
];

export const REPORT_GUIDE_STEPS = [
  "Describe el problema en menos de 2 lineas y agrega sintomas visibles.",
  "Selecciona el vehiculo correcto para agilizar la asignacion.",
  "Adjunta evidencia fotografica cuando sea posible.",
  "Si hay riesgo alto, marca la incidencia como critica en seguimiento.",
];

export const REPORT_RECENT_DRAFTS = [
  { id: "d1", code: "#D-221", label: "Camion 094 - Vibracion en frenos", status: "Borrador" },
  { id: "d2", code: "#D-220", label: "Van 018 - Ruido en suspension", status: "Revisar" },
  { id: "d3", code: "#D-219", label: "Auto 250 - Falla electrica intermitente", status: "Borrador" },
];

export const INCIDENT_MODULE_STATS = [
  { id: "open", label: "Abiertas", value: "8", tone: "gold" },
  { id: "processing", label: "En Proceso", value: "12", tone: "blue" },
  { id: "solved", label: "Resueltas", value: "34", tone: "blue" },
  { id: "critical", label: "Criticas", value: "4", tone: "gold" },
];

export const INCIDENT_FILTER_TAGS = [
  "Criticas",
  "Pendientes",
  "En Ruta",
  "Zona Centro",
  "Ultimas 24h",
  "Sin Asignar",
];

export const INCIDENT_STATUS_OVERVIEW = [
  { id: "critical", label: "Criticas", value: 4 },
  { id: "high", label: "Alta", value: 9 },
  { id: "medium", label: "Media", value: 19 },
  { id: "low", label: "Baja", value: 22 },
];

export const INCIDENT_RESPONSIBLE_TEAMS = [
  { id: "t1", team: "Ruta Rapida", load: "5 casos", eta: "22m" },
  { id: "t2", team: "Mecanica Norte", load: "4 casos", eta: "30m" },
  { id: "t3", team: "Centro Taller", load: "3 casos", eta: "45m" },
];

export const QUICK_LINKS = [
  { id: "vehiculos", icon: "VH", title: "Vehiculos", subtitle: "Gestion de vehiculos" },
  { id: "reportes", icon: "RP", title: "Reportes", subtitle: "Informes y estadisticas" },
];

export const DASHBOARD_HERO_METRICS = [
  { id: "sla", label: "SLA Cumplido", value: "94%" },
  { id: "backlog", label: "Backlog Activo", value: "21" },
  { id: "dispatch", label: "Despachos Hoy", value: "18" },
];

export const DASHBOARD_RECENT_INCIDENTS = [
  {
    id: "#1031",
    title: "Fallo de frenos",
    location: "Ruta 12 - Km 44",
    priority: "high",
    priorityLabel: "Alta",
    time: "Hace 7 min",
  },
  {
    id: "#1029",
    title: "Motor sobrecalentado",
    location: "Zona Norte",
    priority: "medium",
    priorityLabel: "Media",
    time: "Hace 18 min",
  },
  {
    id: "#1028",
    title: "Colision menor",
    location: "Av. Principal",
    priority: "medium",
    priorityLabel: "Media",
    time: "Hace 26 min",
  },
  {
    id: "#1027",
    title: "Bateria agotada",
    location: "Parque Industrial",
    priority: "low",
    priorityLabel: "Baja",
    time: "Hace 41 min",
  },
];

export const DASHBOARD_ACTIVITY = [
  { id: "new", value: "16", label: "Reportes nuevos" },
  { id: "attended", value: "11", label: "Atendidos" },
  { id: "assigned", value: "5", label: "Asignados" },
  { id: "escalated", value: "2", label: "Escalados" },
];

export const DASHBOARD_TIMELINE = [
  { id: "t1", time: "08:20", text: "Unidad CAM-102 asignada a Ruta 5." },
  { id: "t2", time: "09:05", text: "Incidencia #1029 escalada a soporte tecnico." },
  { id: "t3", time: "10:12", text: "Auto 250 marcado como mantenimiento preventivo." },
  { id: "t4", time: "11:03", text: "Resolucion registrada para incidencia #1018." },
];

export const DASHBOARD_WEEKLY_PERFORMANCE = [
  { id: "lun", day: "Lun", value: 68 },
  { id: "mar", day: "Mar", value: 74 },
  { id: "mie", day: "Mie", value: 81 },
  { id: "jue", day: "Jue", value: 76 },
  { id: "vie", day: "Vie", value: 89 },
  { id: "sab", day: "Sab", value: 63 },
];

export const DASHBOARD_TEAM_QUEUE = [
  { id: "a1", team: "Mecanica Norte", task: "2 casos criticos", eta: "ETA 30m" },
  { id: "a2", team: "Ruta Rapida", task: "1 asistencia en camino", eta: "ETA 22m" },
  { id: "a3", team: "Centro Taller", task: "3 revisiones preventivas", eta: "ETA 1h 10m" },
];

export const VEHICLE_SUMMARY = [
  { id: "total", label: "Total de Vehiculos", value: "46" },
  { id: "activos", label: "Activos", value: "38" },
  { id: "mantenimiento", label: "En Mantenimiento", value: "5" },
  { id: "inactivos", label: "Inactivos", value: "3" },
];

export const VEHICLE_TYPE_AVAILABILITY = [
  { id: "camion", label: "Camiones", available: 16, total: 20 },
  { id: "van", label: "Vans", available: 12, total: 14 },
  { id: "auto", label: "Autos", available: 10, total: 12 },
];

export const VEHICLE_MAINTENANCE_QUEUE = [
  { id: "m1", code: "CAM-094", task: "Cambio de pastillas de freno", slot: "Hoy 16:30" },
  { id: "m2", code: "AUT-250", task: "Revision sistema electrico", slot: "Manana 09:00" },
  { id: "m3", code: "VAN-012", task: "Mantenimiento preventivo", slot: "Manana 12:20" },
];

export const VEHICLE_ALERTS = [
  "3 unidades con kilometraje por encima del umbral semanal.",
  "2 vehiculos requieren inspeccion de neumaticos en 24h.",
  "1 unidad sin reporte de telemetria reciente.",
];

export const VEHICLE_ROWS = [
  {
    id: "CAM-102",
    type: "Camion",
    driver: "Luis M.",
    route: "Ruta 5 - Km 120",
    status: "En Ruta",
    statusClass: "progress",
  },
  {
    id: "VAN-018",
    type: "Van",
    driver: "Ana R.",
    route: "Zona Centro",
    status: "Disponible",
    statusClass: "resolved",
  },
  {
    id: "AUT-250",
    type: "Auto",
    driver: "Pedro G.",
    route: "Taller Central",
    status: "Mantenimiento",
    statusClass: "pending",
  },
  {
    id: "CAM-094",
    type: "Camion",
    driver: "Rafael D.",
    route: "Autopista Sur",
    status: "En Ruta",
    statusClass: "progress",
  },
];

export const REPORT_KPIS = [
  { id: "resueltas", title: "Resueltas Este Mes", value: "128", tone: "blue" },
  { id: "tiempo", title: "Tiempo Promedio", value: "2.3h", tone: "gold" },
  { id: "criticas", title: "Criticas", value: "12", tone: "blue" },
];

export const REPORT_BY_ZONE = [
  { id: "centro", zone: "Zona Centro", incidents: 34 },
  { id: "ruta5", zone: "Ruta 5", incidents: 27 },
  { id: "autopista", zone: "Autopista Sur", incidents: 19 },
  { id: "ruta8", zone: "Ruta 8", incidents: 15 },
];

export const REPORT_MONTHLY_TREND = [
  { id: "ene", month: "Ene", solved: 92, opened: 104 },
  { id: "feb", month: "Feb", solved: 101, opened: 109 },
  { id: "mar", month: "Mar", solved: 116, opened: 121 },
  { id: "abr", month: "Abr", solved: 128, opened: 119 },
  { id: "may", month: "May", solved: 123, opened: 114 },
];

export const REPORT_EXPORT_ACTIONS = [
  { id: "pdf", label: "Exportar PDF Ejecutivo" },
  { id: "csv", label: "Descargar CSV Operativo" },
  { id: "mail", label: "Enviar Resumen por Correo" },
];
