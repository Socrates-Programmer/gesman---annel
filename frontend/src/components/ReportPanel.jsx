import { memo, useEffect, useMemo, useState } from "react";

function ReportPanel({
  catalogs,
  formMessage,
  formMessageTone,
  isSubmitting,
  onSubmitReport,
  isCatalogLoading,
}) {
  const [description, setDescription] = useState("");
  const [localValidationMessage, setLocalValidationMessage] = useState("");
  const [selectedRegionalId, setSelectedRegionalId] = useState("");
  const [selectedDistrictId, setSelectedDistrictId] = useState("");
  const [selectedVehicleId, setSelectedVehicleId] = useState("");

  const vehicleOptions = catalogs && Array.isArray(catalogs.vehicles) ? catalogs.vehicles : [];
  const typeOptions = catalogs && Array.isArray(catalogs.incidentTypes) ? catalogs.incidentTypes : [];
  const priorityOptions = catalogs && Array.isArray(catalogs.priorities) ? catalogs.priorities : [];
  const statusOptions = catalogs && Array.isArray(catalogs.incidentStatuses) ? catalogs.incidentStatuses : [];

  const regionalOptions = useMemo(() => {
    const optionsById = new Map();
    vehicleOptions.forEach((item) => {
      if (item.regionalId == null) {
        return;
      }

      const optionId = String(item.regionalId);
      if (!optionsById.has(optionId)) {
        optionsById.set(optionId, {
          id: optionId,
          label: item.regionalName || `Regional ${optionId}`,
        });
      }
    });

    return Array.from(optionsById.values()).sort((a, b) => a.label.localeCompare(b.label, "es"));
  }, [vehicleOptions]);

  const districtOptions = useMemo(() => {
    const optionsById = new Map();
    vehicleOptions
      .filter((item) => {
        if (!selectedRegionalId) {
          return true;
        }
        return String(item.regionalId || "") === selectedRegionalId;
      })
      .forEach((item) => {
        if (item.districtId == null) {
          return;
        }

        const optionId = String(item.districtId);
        if (!optionsById.has(optionId)) {
          optionsById.set(optionId, {
            id: optionId,
            label: item.districtName || `Distrito ${optionId}`,
          });
        }
      });

    return Array.from(optionsById.values()).sort((a, b) => a.label.localeCompare(b.label, "es"));
  }, [vehicleOptions, selectedRegionalId]);

  const filteredVehicleOptions = useMemo(
    () =>
      vehicleOptions.filter((item) => {
        if (selectedRegionalId && String(item.regionalId || "") !== selectedRegionalId) {
          return false;
        }

        if (selectedDistrictId && String(item.districtId || "") !== selectedDistrictId) {
          return false;
        }

        return true;
      }),
    [vehicleOptions, selectedDistrictId, selectedRegionalId]
  );

  const selectsDisabled = isSubmitting || isCatalogLoading;
  const hasCatalogs = typeOptions.length > 0 && priorityOptions.length > 0 && statusOptions.length > 0;

  const displayMessage = localValidationMessage || formMessage;
  const displayTone = localValidationMessage ? "error" : formMessageTone;
  const canSubmit = hasCatalogs && filteredVehicleOptions.length > 0 && !!selectedVehicleId && !selectsDisabled;

  const initialValues = useMemo(
    () => ({
      typeId: typeOptions[0] ? String(typeOptions[0].id) : "",
      priorityId: priorityOptions[0] ? String(priorityOptions[0].id) : "",
      statusId: statusOptions[0] ? String(statusOptions[0].id) : "",
    }),
    [typeOptions, priorityOptions, statusOptions]
  );

  const selectedVehicleLabel = useMemo(() => {
    const selected = filteredVehicleOptions.find((item) => String(item.id) === selectedVehicleId);
    if (!selected) {
      return "";
    }
    return selected.label || `Vehiculo ${selected.id}`;
  }, [filteredVehicleOptions, selectedVehicleId]);

  useEffect(() => {
    if (!selectedDistrictId) {
      return;
    }

    if (!districtOptions.some((item) => item.id === selectedDistrictId)) {
      setSelectedDistrictId("");
    }
  }, [districtOptions, selectedDistrictId]);

  useEffect(() => {
    if (filteredVehicleOptions.length === 0) {
      if (selectedVehicleId) {
        setSelectedVehicleId("");
      }
      return;
    }

    const vehicleStillAvailable = filteredVehicleOptions.some((item) => String(item.id) === selectedVehicleId);
    if (!vehicleStillAvailable && selectedVehicleId) {
      setSelectedVehicleId("");
    }
  }, [filteredVehicleOptions, selectedVehicleId]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());
    payload.vehicleId = selectedVehicleId;
    payload.description = typeof payload.description === "string" ? payload.description.trim() : "";

    if (!payload.vehicleId) {
      setLocalValidationMessage("Debes seleccionar una ficha.");
      return;
    }

    if (!payload.description) {
      setLocalValidationMessage("La descripcion es obligatoria.");
      return;
    }

    if (payload.description.length < 8) {
      setLocalValidationMessage("La descripcion debe tener al menos 8 caracteres.");
      return;
    }

    if (payload.description.length > 1000) {
      setLocalValidationMessage("La descripcion no puede superar los 1000 caracteres.");
      return;
    }

    const reportSubmitted = await onSubmitReport(payload);
    if (reportSubmitted) {
      event.currentTarget.reset();
      setDescription("");
      setLocalValidationMessage("");
    }
  }

  return (
    <section className="module-aside-stack">
      <section className="panel module-panel">
        <h2>Filtro de Fichas</h2>
        <label htmlFor="regionalFilter">Regional</label>
        <select
          id="regionalFilter"
          name="regionalFilter"
          value={selectedRegionalId}
          onChange={(event) => setSelectedRegionalId(event.target.value)}
          disabled={selectsDisabled || regionalOptions.length === 0}
        >
          <option value="">Todas las regionales</option>
          {regionalOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>

        <label htmlFor="districtFilter">Distrito educativo</label>
        <select
          id="districtFilter"
          name="districtFilter"
          value={selectedDistrictId}
          onChange={(event) => setSelectedDistrictId(event.target.value)}
          disabled={selectsDisabled || districtOptions.length === 0}
        >
          <option value="">Todos los distritos</option>
          {districtOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
        <p className="table-results-meta">
          {filteredVehicleOptions.length} ficha(s) disponible(s)
        </p>
      </section>

      <section className="panel report-panel">
        <h2>Reportar Incidencia</h2>

        {!hasCatalogs ? (
          <p className="module-inline-alert">
            Debes crear al menos un tipo, prioridad y estado en catalogos antes de registrar incidencias.
          </p>
        ) : null}

        <form id="reportForm" onSubmit={handleSubmit}>
        <label htmlFor="typeId">Tipo de Incidencia</label>
        <select
          id="typeId"
          name="typeId"
          defaultValue={initialValues.typeId}
          required
          disabled={selectsDisabled || typeOptions.length === 0}
        >
          {typeOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>

        <label htmlFor="priorityId">Prioridad</label>
        <select
          id="priorityId"
          name="priorityId"
          defaultValue={initialValues.priorityId}
          required
          disabled={selectsDisabled || priorityOptions.length === 0}
        >
          {priorityOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>

        <label htmlFor="statusId">Estado inicial</label>
        <select
          id="statusId"
          name="statusId"
          defaultValue={initialValues.statusId}
          required
          disabled={selectsDisabled || statusOptions.length === 0}
        >
          {statusOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>

        <label htmlFor="vehicleId">Ficha</label>
        <select
          id="vehicleId"
          name="vehicleId"
          value={selectedVehicleId}
          onChange={(event) => setSelectedVehicleId(event.target.value)}
          required
          disabled={selectsDisabled || filteredVehicleOptions.length === 0}
        >
          <option value="" disabled>
            {filteredVehicleOptions.length === 0 ? "No hay fichas para el filtro seleccionado" : "Seleccionar ficha"}
          </option>
          {filteredVehicleOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
        {selectedVehicleLabel ? <p className="table-results-meta">Ficha seleccionada: {selectedVehicleLabel}</p> : null}

        <label htmlFor="description">Descripcion del Problema</label>
        <textarea
          id="description"
          name="description"
          rows="4"
          value={description}
          minLength={8}
          maxLength={1000}
          placeholder="Describe sintomas, impacto y contexto del incidente."
          aria-describedby="descriptionHelp descriptionCounter"
          required
          onChange={(event) => {
            setDescription(event.target.value);
            if (localValidationMessage) {
              setLocalValidationMessage("");
            }
          }}
          disabled={selectsDisabled}
        ></textarea>
        <div className="description-meta">
          <span id="descriptionHelp" className="field-help">
            Minimo 8 caracteres, maximo 1000.
          </span>
          <span id="descriptionCounter" className="description-counter">
            {description.length}/1000
          </span>
        </div>

        <button className="submit-btn" type="submit" disabled={!canSubmit}>
          {isSubmitting ? "Enviando..." : "Enviar Reporte"}
        </button>
        <p id="formMessage" className={`form-message ${displayTone || ""}`} role="status" aria-live="polite">
          {displayMessage}
        </p>
        </form>
      </section>
    </section>
  );
}

export default memo(ReportPanel);
