import { hasDb } from "./articles-db.js";

export async function ensureDownloadStatsTable(env) {
  if (!hasDb(env)) return false;
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS release_stats (release_id TEXT PRIMARY KEY, download_count INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL)").run();
  return true;
}

export async function incrementReleaseDownload(env, releaseId) {
  if (!releaseId || !(await ensureDownloadStatsTable(env))) return false;
  const now = Date.now();
  await env.DB.prepare("INSERT INTO release_stats (release_id, download_count, updated_at) VALUES (?, 1, ?) ON CONFLICT(release_id) DO UPDATE SET download_count = download_count + 1, updated_at = excluded.updated_at")
    .bind(String(releaseId), now)
    .run();
  return true;
}

export async function applyDownloadStats(env, catalog) {
  if (!(await ensureDownloadStatsTable(env))) return catalog;
  const releases = [];
  for (const software of catalog.software || []) {
    for (const release of software.releases || []) releases.push(release);
  }
  if (!releases.length) return catalog;

  const ids = releases.map(release => release.id);
  const placeholders = ids.map(() => "?").join(",");
  const result = await env.DB.prepare(`SELECT release_id, download_count FROM release_stats WHERE release_id IN (${placeholders})`).bind(...ids).all();
  const stats = new Map((result.results || []).map(row => [row.release_id, Number(row.download_count || 0)]));
  for (const release of releases) {
    if (stats.has(release.id)) release.downloadCount = stats.get(release.id);
  }
  return catalog;
}
