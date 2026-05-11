import { inferAssetKind, listAssets, publicAssetUrl } from "../../../_lib/assets-db.js";
import { json } from "../../../_lib/releases.js";
import { requireAdmin } from "../_lib.js";

export async function onRequestPost({ request, env }) {
  const auth = await requireAdmin(request, env);
  if (!auth.ok) return auth.response;
  const options = auth.body || {};
  const dbResult = await listAssets(env, { ...options, status: options.status || "all", pageSize: 100 });
  const r2Assets = await listR2Assets(env, options);
  const merged = mergeAssets(dbResult?.assets || [], r2Assets, options);
  const pageSize = Math.min(Math.max(Number(options.pageSize) || 80, 1), 100);
  const page = Math.max(Number(options.page) || 1, 1);
  const start = (page - 1) * pageSize;
  return json({ success: true, assets: merged.slice(start, start + pageSize), total: merged.length, page, pageSize, source: dbResult ? "d1+r2" : "r2" });
}

async function listR2Assets(env, { kind = "all", search = "" } = {}) {
  if (!env.SOFTWARE_BUCKET?.list) return [];
  const objects = [];
  let cursor;
  do {
    const result = await env.SOFTWARE_BUCKET.list({ cursor, limit: 100 });
    objects.push(...(result.objects || []));
    cursor = result.truncated ? result.cursor : undefined;
  } while (cursor && objects.length < 1000);
  return objects.map(object => {
    const inferredKind = inferAssetKind(object.key, object.httpMetadata?.contentType || "");
    return {
      id: `r2:${object.key}`,
      storageId: "default",
      key: object.key,
      kind: inferredKind,
      mimeType: object.httpMetadata?.contentType || "",
      fileName: object.key.split("/").pop() || object.key,
      fileSize: object.size || 0,
      sha256: "",
      publicUrl: "",
      source: "r2-scan",
      refType: "",
      refId: "",
      status: "active",
      createdAt: object.uploaded ? new Date(object.uploaded).getTime() : 0,
      updatedAt: object.uploaded ? new Date(object.uploaded).getTime() : 0,
      registered: false
    };
  }).filter(asset => (kind === "all" || asset.kind === kind) && (!search || [asset.key, asset.fileName].join(" ").toLowerCase().includes(String(search).toLowerCase())));
}

function mergeAssets(dbAssets, r2Assets, { kind = "all", search = "", status = "all" } = {}) {
  const map = new Map();
  for (const asset of dbAssets) {
    map.set(asset.key, { ...asset, registered: true });
  }
  for (const asset of r2Assets) {
    if (!map.has(asset.key)) map.set(asset.key, asset);
  }
  return Array.from(map.values())
    .map(asset => ({ ...asset, url: publicAssetUrl(asset) }))
    .filter(asset => kind === "all" || asset.kind === kind)
    .filter(asset => status === "all" || asset.status === status)
    .filter(asset => !search || [asset.fileName, asset.key, asset.refId].join(" ").toLowerCase().includes(String(search).toLowerCase()))
    .sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0));
}
