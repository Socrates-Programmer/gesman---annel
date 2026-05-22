import { useState } from "react";
import { login } from "../data/authApi";

export default function LoginPage({ onLoginSuccess }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState("muted");

  async function handleSubmit(event) {
    event.preventDefault();

    if (!username.trim() || !password) {
      setMessage("Usuario y contrasena son obligatorios.");
      setMessageTone("error");
      return;
    }

    setIsSubmitting(true);
    setMessage("Iniciando sesion...");
    setMessageTone("muted");

    try {
      const session = await login({
        username: username.trim(),
        password,
      });
      setMessage("Sesion iniciada correctamente.");
      setMessageTone("success");
      onLoginSuccess(session || {});
    } catch (error) {
      setMessage(error && error.message ? error.message : "No fue posible iniciar sesion.");
      setMessageTone("error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="route-content auth-route">
      <section className="panel module-panel auth-panel">
        <aside className="auth-hero" aria-hidden="true">
          <p className="auth-hero-eyebrow">TRAE Helpdesk</p>
          <h2>Centro Operativo de Incidencias</h2>
          <p>
            Monitorea la flota, reporta eventos y mantiene el control de operaciones en tiempo real.
          </p>
          <div className="auth-hero-tags">
            <span>SQL Server Online</span>
            <span>Flota y Reportes</span>
            <span>Acceso Seguro</span>
          </div>
        </aside>

        <div className="auth-form-wrap">
          <h1>Iniciar Sesion</h1>
          <p className="module-description">Accede con la cuenta tecnica configurada en el servidor.</p>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-field">
              <label htmlFor="username">Usuario</label>
              <input
                id="username"
                name="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                disabled={isSubmitting}
                autoComplete="username"
              />
            </div>

            <div className="auth-field">
              <label htmlFor="password">Contrasena</label>
              <input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={isSubmitting}
                autoComplete="current-password"
              />
            </div>

            <button className="submit-btn auth-submit-btn" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Ingresando..." : "Entrar"}
            </button>
          </form>

          <p className="module-description">Modo demo sin backend: usuario `mini` y contrasena `mini123`.</p>
          <p className={`form-message auth-message ${messageTone}`}>{message}</p>
        </div>
      </section>
    </main>
  );
}
