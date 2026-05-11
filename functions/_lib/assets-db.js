import { hasDb } from "./articles-db.js";
import { id } from "./catalog.js";

export async function ensureAssetsTable(env) {
  if (!hasDb(env)) return false;
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS r2_assets (id TEXT PRIMARY KEY, storage_id TEXT NOT NULL DEFAULT 'default', bucket TEXT NOT NULL DEFAULT '', key TEXT NOT NULL, kind TEXT NOT NULL, mime_type TEXT NOT NULL DEFAULT '', file_name TEXT NOT NULL DEFAULT '', file_size INTEGER NOT NULL DEFAULT 0, sha256 TEXT NOT NULL DEFAULT '', public_url TEXT NOT NULL DEFAULT '', source TEXT NOT NULL DEFAULT '', ref_type TEXT NOT NULL DEFAULT '', ref_id TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'active', created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, UNIQUE(storage_id, key))").run();
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_r2_assets_kind_status ON r2_assets(kind, status, updated_at)").run();
  return true;
}

export async function saveAsset(env, input) {
  if (!(await ensureAssetsTable(env))) return null;
  const now = Date.now();
  const asset = {
    id: input.id || id("asset"),
    storageId: String(input.storageId || "default"),
    bucket: String(input.bucket || ""),
    key: String(input.key || ""),
    kind: String(input.kind || "other"),
    mimeType: String(input.mimeType || ""),
    fileName: String(input.fileName || input.key?.split("/").pop() || ""),
    fileSize: Number(input.fileSize || 0),
    sha256: String(input.sha256 || ""),
    publicUrl: String(input.publicUrl || ""),
    source: String(input.source || "manual-upload"),
    refType: String(input.refType || ""),
    refId: String(input.refId || ""),
    status: String(input.status || "active"),
    createdAt: Number(input.createdAt || now),
    updatedAt: now
  };
  await env.DB.prepare("INSERT INTO r2_assets (id,storage_id,bucket,key,kind,mime_type,file_name,file_size,sha256,public_url,source,ref_type,ref_id,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(storage_id, key) DO UPDATE SET kind=excluded.kind, mime_type=excluded.mime_type, file_name=excluded.file_name, file_size=excluded.file_size, sha256=excluded.sha256, public_url=excluded.public_url, source=excluded.source, ref_type=excluded.ref_type, ref_id=excluded.ref_id, status=excluded.status, updated_at=excluded.updated_at")
    .bind(asset.id, asset.storageId, asset.bucket, asset.key, asset.kind, asset.mimeType, asset.fileName, asset.fileSize, asset.sha256, asset.publicUrl, asset.source, asset.refType, asset.refId, asset.status, asset.createdAt, asset.updatedAt)
    .run();
  return asset;
}

export async function listAssets(env, { kind = "all", search = "", status = "active", page = 1, pageSize = 60 } = {}) {
  if (!(await ensureAssetsTable(env))) return null;
  const clauses = [];
  const values = [];
  if (kind && kind !== "all") { clauses.push("kind = ?"); values.push(kind); }
  if (status && status !== "all") { clauses.push("status = ?"); values.push(status); }
  if (search) { clauses.push("(file_name LIKE ? OR key LIKE ? OR ref_id LIKE ?)"); values.push(`%${search}%`, `%${search}%`, `%${search}%`); }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const limit = Math.min(Math.max(Number(pageSize) || 60, 1), 100);
  const offset = Math.max((Number(page) || 1) - 1, 0) * limit;
  const count = await env.DB.prepare(`SELECT COUNT(*) AS total FROM r2_assets ${where}`).bind(...values).first();
  const result = await env.DB.prepare(`SELECT * FROM r2_assets ${where} ORDER BY updated_at DESC LIMIT ? OFFSET ?`).bind(...values, limit, offset).all();
  return { assets: (result.results || []).map(rowToAsset), total: Number(count?.total || 0), page: Number(page) || 1, pageSize: limit };
}

export async function getAsset(env, assetId) {
  if (!(await ensureAssetsTable(env))) return null;
  const row = await env.DB.prepare("SELECT * FROM r2_assets WHERE id = ? OR key = ? LIMIT 1").bind(assetId, assetId).first();
  return row ? rowToAsset(row) : null;
}

export async function markAssetDeleted(env, assetId) {
  if (!(await ensureAssetsTable(env))) return false;
  await env.DB.prepare("UPDATE r2_assets SET status = 'deleted', updated_at = ? WHERE id = ?").bind(Date.now(), assetId).run();
  return true;
}

export function publicAssetUrl(asset) {
  if (asset.publicUrl) return asset.publicUrl;
  if (asset.kind === "software") return `/download/${encodeURIComponent(asset.refId || asset.id)}`;
  return `/media/${encodeURIComponent(asset.key)}`;
}

function rowToAsset(row) {
  const asset = {
    id: row.id,
    storageId: row.storage_id,
    bucket: row.bucket,
    key: row.key,
    kind: row.kind,
    mimeType: row.mime_type,
    fileName: row.file_name,
    fileSize: Number(row.file_size || 0),
    sha256: row.sha256 || "",
    publicUrl: row.public_url || "",
    source: row.source || "",
    refType: row.ref_type || "",
    refId: row.ref_id || "",
    status: row.status || "active",
    createdAt: Number(row.created_at || 0),
    updatedAt: Number(row.updated_at || 0)
  };
  asset.url = publicAssetUrl(asset);
  return asset;
}
