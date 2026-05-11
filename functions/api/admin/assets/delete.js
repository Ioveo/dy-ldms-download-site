import { getAsset, markAssetDeleted } from "../../../_lib/assets-db.js";
import { loadCatalog } from "../../../_lib/catalog.js";
import { json } from "../../../_lib/releases.js";
import { requireAdmin } from "../_lib.js";

export async function onRequestPost({ request, env }) {
  const auth = await requireAdmin(request, env);
  if (!auth.ok) return auth.response;
  const requested = String(auth.body?.assetId || auth.body?.key || "");
  let asset = await getAsset(env, requested);
  if (!asset && requested) {
    const key = requested.startsWith("r2:") ? requested.slice(3) : requested;
    asset = { id: `r2:${key}`, storageId: "default", key, kind: "other", publicUrl: "", url: `/media/${encodeURIComponent(key)}` };
  }
  if (!asset?.key) return json({ success: false, msg: "资源不存在" }, 404);
  const references = await findReferences(env, asset);
  if (references.length && !auth.body?.force) return json({ success: false, msg: "资源正在被使用，不能删除", references }, 400);
  if (asset.storageId === "default" && env.SOFTWARE_BUCKET?.delete) await env.SOFTWARE_BUCKET.delete(asset.key);
  if (!asset.id.startsWith("r2:")) await markAssetDeleted(env, asset.id);
  return json({ success: true });
}

async function findReferences(env, asset) {
  const catalog = await loadCatalog(env);
  const refs = [];
  for (const software of catalog.software || []) {
    if (software.coverUrl === asset.url || software.coverUrl === asset.publicUrl) refs.push({ type: "software-cover", id: software.id, title: software.name });
    for (const release of software.releases || []) {
      if (release.fileKey === asset.key || release.assetId === asset.id) refs.push({ type: "release-file", id: release.id, title: `${software.name} ${release.version}` });
    }
  }
  for (const article of catalog.articles || []) {
    if (article.coverUrl === asset.url || article.coverUrl === asset.publicUrl) refs.push({ type: "article-cover", id: article.id, title: article.title });
    if (String(article.content || "").includes(asset.url) || String(article.content || "").includes(asset.key)) refs.push({ type: "article-content", id: article.id, title: article.title });
  }
  return refs;
}
