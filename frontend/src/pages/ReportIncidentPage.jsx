import { useCallback, useEffect, useState } from "react";
import ReportPanel from "../components/ReportPanel";
import {
  createIncidentCategory,
  createIncidentStatus,
  createIncidentType,
  createPriority,
  deleteIncidentCategory,
  deleteIncidentStatus,
  deleteIncidentType,
  deletePriority,
  fetchIncidentFormCatalogs,
  updateIncidentCategory,
  updateIncidentStatus,
  updateIncidentType,
  updatePriority,
} from "../data/catalogApi";
import { createIncident } from "../data/incidentsApi";

const EMPTY_CATALOGS = {
  vehicles: [],
  incidentTypes: [],
  priorities: [],
  incidentStatuses: [],
  incidentCategories: [],
};

const EMPTY_TYPE_FORM = {
  name: "",
  description: "",
  categoryId: "",
};

const EMPTY_PRIORITY_FORM = {
  name: "",
  level: "",
};

export default function ReportIncidentPage() {
  const [catalogs, setCatalogs] = useState(EMPTY_CATALOGS);
  const [isCatalogLoading, setIsCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const [catalogMessage, setCatalogMessage] = useState("");
  const [catalogMessageTone, setCatalogMessageTone] = useState("muted");

  const [formMessage, setFormMessage] = useState("");
  const [formMessageTone, setFormMessageTone] = useState("success");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editing, setEditing] = useState({
    categoryId: null,
    typeId: null,
    priorityId: null,
    statusId: null,
  });

  const [categoryName, setCategoryName] = useState("");
  const [typeForm, setTypeForm] = useState(EMPTY_TYPE_FORM);
  const [priorityForm, setPriorityForm] = useState(EMPTY_PRIORITY_FORM);
  const [statusName, setStatusName] = useState("");

  const loadCatalogs = useCallback(async () => {
    setIsCatalogLoading(true);
    setCatalogError("");

    try {
      const response = await fetchIncidentFormCatalogs();
      setCatalogs(response || EMPTY_CATALOGS);
    } catch (error) {
      setCatalogs(EMPTY_CATALOGS);
      setCatalogError(error && error.message ? error.message : "No se pudieron cargar los catalogos.");
    } finally {
      setIsCatalogLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCatalogs();
  }, [loadCatalogs]);

  useEffect(() => {
    if (!typeForm.categoryId && catalogs.incidentCategories && catalogs.incidentCategories[0]) {
      setTypeForm((current) => ({
        ...current,
        categoryId: String(catalogs.incidentCategories[0].id),
      }));
    }
  }, [catalogs, typeForm.categoryId]);

  const handleReportSubmit = useCallback(async (payload) => {
    setIsSubmitting(true);
    setFormMessage("Enviando reporte...");
    setFormMessageTone("muted");

    try {
      const createdIncident = await createIncident(payload);
      const incidentCode = createdIncident && createdIncident.code ? ` ${createdIncident.code}` : "";
      setFormMessage(`Reporte${incidentCode} enviado correctamente.`);
      setFormMessageTone("success");
      return true;
    } catch (error) {
      const errorMessage = error && error.message ? error.message : "No se pudo enviar el reporte.";
      setFormMessage(errorMessage);
      setFormMessageTone("error");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  async function handleCatalogAction(actionFn, successMessage) {
    setCatalogMessage("");
    setCatalogMessageTone("muted");

    try {
      await actionFn();
      setCatalogMessage(successMessage);
      setCatalogMessageTone("success");
      await loadCatalogs();
      return true;
    } catch (error) {
      setCatalogMessage(error && error.message ? error.message : "No se pudo completar la accion.");
      setCatalogMessageTone("error");
      return false;
    }
  }

  async function handleDeleteCatalogItem(confirmMessage, deleteAction, successMessage) {
    if (!window.confirm(confirmMessage)) {
      return;
    }
    await handleCatalogAction(deleteAction, successMessage);
  }

  function resetCategoryEdit() {
    setEditing((current) => ({ ...current, categoryId: null }));
    setCategoryName("");
  }

  function resetTypeEdit() {
    setEditing((current) => ({ ...current, typeId: null }));
    setTypeForm({
      ...EMPTY_TYPE_FORM,
      categoryId: catalogs.incidentCategories[0] ? String(catalogs.incidentCategories[0].id) : "",
    });
  }

  function resetPriorityEdit() {
    setEditing((current) => ({ ...current, priorityId: null }));
    setPriorityForm(EMPTY_PRIORITY_FORM);
  }

  function resetStatusEdit() {
    setEditing((current) => ({ ...current, statusId: null }));
    setStatusName("");
  }

  async function submitCategory(event) {
    event.preventDefault();
    const payload = { name: categoryName.trim() };
    if (!payload.name) {
      setCatalogMessage("Debes indicar nombre de categoria.");
      setCatalogMessageTone("error");
      return;
    }

    const ok = editing.categoryId
      ? await handleCatalogAction(
          () => updateIncidentCategory(editing.categoryId, payload),
          "Categoria actualizada correctamente."
        )
      : await handleCatalogAction(() => createIncidentCategory(payload), "Categoria creada correctamente.");

    if (ok) {
      resetCategoryEdit();
    }
  }

  async function submitType(event) {
    event.preventDefault();
    const payload = {
      name: typeForm.name.trim(),
      description: typeForm.description.trim(),
      categoryId: typeForm.categoryId,
    };

    if (!payload.name || !payload.categoryId) {
      setCatalogMessage("Tipo y categoria son obligatorios.");
      setCatalogMessageTone("error");
      return;
    }

    const ok = editing.typeId
      ? await handleCatalogAction(
          () => updateIncidentType(editing.typeId, payload),
          "Tipo de incidencia actualizado correctamente."
        )
      : await handleCatalogAction(() => createIncidentType(payload), "Tipo de incidencia creado correctamente.");

    if (ok) {
      resetTypeEdit();
    }
  }

  async function submitPriority(event) {
    event.preventDefault();
    const payload = {
      name: priorityForm.name.trim(),
      level: priorityForm.level.trim(),
    };

    if (!payload.name) {
      setCatalogMessage("Debes indicar nombre de prioridad.");
      setCatalogMessageTone("error");
      return;
    }

    const ok = editing.priorityId
      ? await handleCatalogAction(
          () => updatePriority(editing.priorityId, payload),
          "Prioridad actualizada correctamente."
        )
      : await handleCatalogAction(() => createPriority(payload), "Prioridad creada correctamente.");

    if (ok) {
      resetPriorityEdit();
    }
  }

  async function submitStatus(event) {
    event.preventDefault();
    const payload = { name: statusName.trim() };
    if (!payload.name) {
      setCatalogMessage("Debes indicar nombre de estado.");
      setCatalogMessageTone("error");
      return;
    }

    const ok = editing.statusId
      ? await handleCatalogAction(
          () => updateIncidentStatus(editing.statusId, payload),
          "Estado actualizado correctamente."
        )
      : await handleCatalogAction(() => createIncidentStatus(payload), "Estado creado correctamente.");

    if (ok) {
      resetStatusEdit();
    }
  }

  return (
    <main className="route-content module-route report-module-route">
      <section className="panel module-hero report-module-hero">
        <div>
          <p className="module-eyebrow">Operacion Gesman</p>
          <h2>Reportar Incidencia</h2>
          <p className="module-description">
            Registro de incidencias conectado a SQL Server con catalogos administrables.
          </p>
        </div>
      </section>

      <section className="module-grid-main-pro">
        <ReportPanel
          catalogs={catalogs}
          formMessage={formMessage}
          formMessageTone={formMessageTone}
          isSubmitting={isSubmitting}
          isCatalogLoading={isCatalogLoading}
          onSubmitReport={handleReportSubmit}
        />

        <section className="module-aside-stack">
          <section className="panel module-panel">
            <h2>Catalogos de Incidencia</h2>
            {catalogError ? <p className="module-inline-alert">{catalogError}</p> : null}
            <p className={`form-message ${catalogMessageTone || "muted"}`}>{catalogMessage}</p>

            <article className="catalog-block">
              <h3>Categorias</h3>
              <form className="catalog-form" onSubmit={submitCategory}>
                <input
                  name="name"
                  placeholder="Nombre de categoria"
                  value={categoryName}
                  onChange={(event) => setCategoryName(event.target.value)}
                />
                <button className="small-btn primary" type="submit">
                  {editing.categoryId ? "Guardar" : "Crear"}
                </button>
                {editing.categoryId ? (
                  <button className="small-btn" type="button" onClick={resetCategoryEdit}>
                    Cancelar
                  </button>
                ) : null}
              </form>
              <ul className="catalog-list">
                {(catalogs.incidentCategories || []).map((item) => (
                  <li key={item.id}>
                    <span>{item.name}</span>
                    <div className="catalog-actions">
                      <button
                        className="small-btn"
                        type="button"
                        onClick={() => {
                          setEditing((current) => ({ ...current, categoryId: item.id }));
                          setCategoryName(item.name || "");
                        }}
                      >
                        Editar
                      </button>
                      <button
                        className="small-btn"
                        type="button"
                        onClick={() =>
                          handleDeleteCatalogItem(
                            "Se eliminara la categoria seleccionada. Deseas continuar?",
                            () => deleteIncidentCategory(item.id),
                            "Categoria eliminada."
                          )
                        }
                      >
                        Eliminar
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </article>

            <article className="catalog-block">
              <h3>Tipos</h3>
              <form className="catalog-form" onSubmit={submitType}>
                <input
                  name="name"
                  placeholder="Nombre de tipo"
                  value={typeForm.name}
                  onChange={(event) =>
                    setTypeForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                />
                <select
                  name="categoryId"
                  value={typeForm.categoryId}
                  onChange={(event) =>
                    setTypeForm((current) => ({
                      ...current,
                      categoryId: event.target.value,
                    }))
                  }
                >
                  <option value="">Selecciona categoria</option>
                  {(catalogs.incidentCategories || []).map((item) => (
                    <option key={item.id} value={String(item.id)}>
                      {item.name}
                    </option>
                  ))}
                </select>
                <input
                  name="description"
                  placeholder="Descripcion opcional"
                  value={typeForm.description}
                  onChange={(event) =>
                    setTypeForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                />
                <button className="small-btn primary" type="submit">
                  {editing.typeId ? "Guardar" : "Crear"}
                </button>
                {editing.typeId ? (
                  <button className="small-btn" type="button" onClick={resetTypeEdit}>
                    Cancelar
                  </button>
                ) : null}
              </form>
              <ul className="catalog-list">
                {(catalogs.incidentTypes || []).map((item) => (
                  <li key={item.id}>
                    <span>
                      {item.name} <small>({item.categoryName})</small>
                    </span>
                    <div className="catalog-actions">
                      <button
                        className="small-btn"
                        type="button"
                        onClick={() => {
                          setEditing((current) => ({ ...current, typeId: item.id }));
                          setTypeForm({
                            name: item.name || "",
                            description: item.description || "",
                            categoryId: item.categoryId ? String(item.categoryId) : "",
                          });
                        }}
                      >
                        Editar
                      </button>
                      <button
                        className="small-btn"
                        type="button"
                        onClick={() =>
                          handleDeleteCatalogItem(
                            "Se eliminara el tipo seleccionado. Deseas continuar?",
                            () => deleteIncidentType(item.id),
                            "Tipo eliminado."
                          )
                        }
                      >
                        Eliminar
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </article>

            <article className="catalog-block">
              <h3>Prioridades</h3>
              <form className="catalog-form" onSubmit={submitPriority}>
                <input
                  name="name"
                  placeholder="Nombre de prioridad"
                  value={priorityForm.name}
                  onChange={(event) =>
                    setPriorityForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                />
                <input
                  name="level"
                  type="number"
                  placeholder="Nivel (opcional)"
                  value={priorityForm.level}
                  onChange={(event) =>
                    setPriorityForm((current) => ({
                      ...current,
                      level: event.target.value,
                    }))
                  }
                />
                <button className="small-btn primary" type="submit">
                  {editing.priorityId ? "Guardar" : "Crear"}
                </button>
                {editing.priorityId ? (
                  <button className="small-btn" type="button" onClick={resetPriorityEdit}>
                    Cancelar
                  </button>
                ) : null}
              </form>
              <ul className="catalog-list">
                {(catalogs.priorities || []).map((item) => (
                  <li key={item.id}>
                    <span>
                      {item.name} <small>{item.level != null ? `Nivel ${item.level}` : ""}</small>
                    </span>
                    <div className="catalog-actions">
                      <button
                        className="small-btn"
                        type="button"
                        onClick={() => {
                          setEditing((current) => ({ ...current, priorityId: item.id }));
                          setPriorityForm({
                            name: item.name || "",
                            level: item.level != null ? String(item.level) : "",
                          });
                        }}
                      >
                        Editar
                      </button>
                      <button
                        className="small-btn"
                        type="button"
                        onClick={() =>
                          handleDeleteCatalogItem(
                            "Se eliminara la prioridad seleccionada. Deseas continuar?",
                            () => deletePriority(item.id),
                            "Prioridad eliminada."
                          )
                        }
                      >
                        Eliminar
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </article>

            <article className="catalog-block">
              <h3>Estados</h3>
              <form className="catalog-form" onSubmit={submitStatus}>
                <input
                  name="name"
                  placeholder="Nombre de estado"
                  value={statusName}
                  onChange={(event) => setStatusName(event.target.value)}
                />
                <button className="small-btn primary" type="submit">
                  {editing.statusId ? "Guardar" : "Crear"}
                </button>
                {editing.statusId ? (
                  <button className="small-btn" type="button" onClick={resetStatusEdit}>
                    Cancelar
                  </button>
                ) : null}
              </form>
              <ul className="catalog-list">
                {(catalogs.incidentStatuses || []).map((item) => (
                  <li key={item.id}>
                    <span>{item.name}</span>
                    <div className="catalog-actions">
                      <button
                        className="small-btn"
                        type="button"
                        onClick={() => {
                          setEditing((current) => ({ ...current, statusId: item.id }));
                          setStatusName(item.name || "");
                        }}
                      >
                        Editar
                      </button>
                      <button
                        className="small-btn"
                        type="button"
                        onClick={() =>
                          handleDeleteCatalogItem(
                            "Se eliminara el estado seleccionado. Deseas continuar?",
                            () => deleteIncidentStatus(item.id),
                            "Estado eliminado."
                          )
                        }
                      >
                        Eliminar
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </article>
          </section>
        </section>
      </section>
    </main>
  );
}
