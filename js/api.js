async function api(action, params = {}) {
  try {
    const res = await fetch(FORTE_API_URL, { method: "POST", body: new URLSearchParams({ action, ...params }) });
    return await res.json();
  } catch (err) { return { ok: false, error: "Gagal terhubung ke server." }; }
}
function getSession() { try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)); } catch { return null; } }
function setSession(data) { sessionStorage.setItem(SESSION_KEY, JSON.stringify(data)); }
function requireRole(role) {
  const s = getSession();
  if (!s || s.role !== role) { location.replace("index.html"); return null; }
  return s;
}
function logout() { sessionStorage.removeItem(SESSION_KEY); location.href = "index.html"; }
function esc(t) { return String(t ?? "").replace(/[&<>"']/g, (c) => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c])); }