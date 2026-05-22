import { ApiError, requestJson } from "./apiClient";

const DEMO_SESSION_KEY = "gesman_demo_session_v1";
const DEMO_CREDENTIALS = Object.freeze({
  username: "mini",
  password: "mini123",
});

export async function fetchSession() {
  try {
    const payload = await requestJson("/api/auth/session");
    return payload && payload.data
      ? payload.data
      : { isAuthenticated: false, username: null, userId: null };
  } catch (error) {
    const demoSession = readDemoSession();
    if (demoSession) {
      return demoSession;
    }
    return { isAuthenticated: false, username: null, userId: null };
  }
}

export async function login(payload) {
  const username = typeof payload?.username === "string" ? payload.username.trim() : "";
  const password = typeof payload?.password === "string" ? payload.password : "";

  try {
    const response = await requestJson("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return response && response.data ? response.data : null;
  } catch (error) {
    // Fallback demo mode when backend auth is unavailable or not configured.
  }

  if (username === DEMO_CREDENTIALS.username && password === DEMO_CREDENTIALS.password) {
    const session = {
      isAuthenticated: true,
      username: DEMO_CREDENTIALS.username,
      userId: 1,
    };
    saveDemoSession(session);
    return session;
  }

  throw new ApiError("Credenciales invalidas.", {
    status: 401,
    code: "INVALID_CREDENTIALS",
  });
}

export async function logout() {
  try {
    await requestJson("/api/auth/logout", {
      method: "POST",
    });
  } catch (error) {
    // Ignore and clear local demo session anyway.
  }

  clearDemoSession();
}

function readDemoSession() {
  if (typeof window === "undefined" || !window.localStorage) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(DEMO_SESSION_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (!parsed || parsed.isAuthenticated !== true) {
      return null;
    }

    return parsed;
  } catch (error) {
    return null;
  }
}

function saveDemoSession(session) {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }

  window.localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(session));
}

function clearDemoSession() {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }

  window.localStorage.removeItem(DEMO_SESSION_KEY);
}
