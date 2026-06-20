const BASE = "http://localhost:8080/api";

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
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function register({ firstName, lastName, email, password }) {
  return request("/v1/auth/register", {
    method: "POST",
    body: JSON.stringify({ firstName, lastName, email, password }),
  });
}

export async function login({ email, password }) {
  return request("/v1/auth/authenticate", {
    method: "POST",
    body: JSON.stringify({ email, password }),
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
