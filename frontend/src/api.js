// Local dev: falls back to the relative "/api" the Vite proxy forwards to localhost:8080
// (see vite.config.js) -- zero setup needed, same as before.
// Netlify build: VITE_API_BASE_URL is set in Netlify's own build environment to the real
// Render backend URL, e.g. https://reframe-backend-xyz.onrender.com/api. Vite bakes this in
// at build time, so it has to be set there, not in a .env file that ships with the build.
const BASE = import.meta.env.VITE_API_BASE_URL || "/api";

function getToken() {
  return localStorage.getItem("reframe_token");
}

async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    const error = new Error(text || `HTTP ${res.status}`);
    error.status = res.status;
    throw error;
  }
  return res.json();
}

export async function register({ firstName, lastName, email, password, country }) {
  return request("/v1/auth/register", {
    method: "POST",
    body: JSON.stringify({ firstName, lastName, email, password, country }),
  });
}

export async function googleLogin(credential) {
  return request("/v1/auth/google", {
    method: "POST",
    body: JSON.stringify({ credential }),
  });
}

export async function login({ email, password }) {
  return request("/v1/auth/authenticate", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function resendVerification(email) {
  return request("/v1/auth/resend-verification", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function getProfile() {
  return request("/user/profile");
}

export async function analyzeBrainDump({ rawText, sessionId }) {
  return request("/braindump/analyze", {
    method: "POST",
    body: JSON.stringify({ rawText, sessionId }),
  });
}

// Returns audio bytes, not JSON -- can't go through request(), which always calls res.json().
export async function speakText(text) {
  const token = getToken();
  const res = await fetch(`${BASE}/voice/speak`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const errorText = await res.text();
    const error = new Error(errorText || `HTTP ${res.status}`);
    error.status = res.status;
    throw error;
  }
  return res.blob();
}

export async function voiceExchange({ transcript, history, speakerName }) {
  return request("/voice/exchange", {
    method: "POST",
    body: JSON.stringify({ transcript, history, speakerName }),
  });
}

export async function getGraph(sessionId) {
  return request(`/graph/${sessionId}`);
}

export async function getHistory() {
  return request("/braindump/history");
}

export async function getSession(sessionId) {
  return request(`/graph/${sessionId}`);
}

export async function updateAssumptions(issueId, rejectedIndices) {
  return request(`/graph/issues/${issueId}/assumptions`, {
    method: "PATCH",
    body: JSON.stringify({ rejectedIndices }),
  });
}
