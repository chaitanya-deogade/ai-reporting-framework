/**
 * GitHub Contents API helper
 * Used to persist certification changes directly to reports.json
 * without a backend. The PAT is baked into the build at deploy time.
 */

const OWNER = 'chaitanya-deogade';
const REPO = 'ai-reporting-framework';
const PATH = 'data/reports.json';
const API_BASE = 'https://api.github.com';

function getToken() {
  return import.meta.env.VITE_GITHUB_TOKEN;
}

function authHeaders() {
  const token = getToken();
  if (!token) throw new Error('VITE_GITHUB_TOKEN is not set.');
  return {
    Authorization: `token ${token}`,
    Accept: 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
  };
}

/**
 * Fetch current reports.json from GitHub, returning { data, sha }.
 */
async function fetchReportsFile() {
  const resp = await fetch(`${API_BASE}/repos/${OWNER}/${REPO}/contents/${PATH}`, {
    headers: authHeaders(),
  });
  if (!resp.ok) throw new Error(`GitHub API error: ${resp.status} ${resp.statusText}`);
  const file = await resp.json();
  // Content is base64 encoded by GitHub
  const text = decodeURIComponent(escape(atob(file.content)));
  return { data: JSON.parse(text), sha: file.sha };
}

/**
 * Commit updated reports.json back to GitHub on main.
 */
async function commitReportsFile(data, sha, message) {
  const content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));
  const resp = await fetch(`${API_BASE}/repos/${OWNER}/${REPO}/contents/${PATH}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ message, content, sha }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.message || `Commit failed: ${resp.status}`);
  }
  return resp.json();
}

/**
 * Update a single report's certification in reports.json and commit.
 * Returns the new certification object on success.
 */
export async function persistCertification(reportId, certification) {
  if (!getToken()) {
    throw new Error('GitHub token not configured. Set VITE_GITHUB_TOKEN in repo secrets.');
  }

  const { data, sha } = await fetchReportsFile();

  const idx = data.reports.findIndex((r) => r.id === reportId);
  if (idx === -1) throw new Error(`Report ${reportId} not found in reports.json`);

  data.reports[idx].certification = certification;

  const certLabel = {
    enterprise_certified: 'Enterprise Certified',
    bu_certified: 'BU Certified',
    none: 'Ungoverned',
  }[certification.status] || certification.status;

  const message = `cert: "${data.reports[idx].name}" → ${certLabel} by ${certification.certified_by}`;
  await commitReportsFile(data, sha, message);

  return certification;
}

/**
 * Returns true if the GitHub token env var is configured in this build.
 */
export function isCertifyApiEnabled() {
  return !!getToken();
}
