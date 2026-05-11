import { loadCatalog, saveCatalog } from "../../../_lib/catalog.js";
import { json } from "../../../_lib/releases.js";
import { requireAdmin, success } from "../_lib.js";

export async function onRequestPost({ request, env }) {
  const auth = await requireAdmin(request, env);
  if (!auth.ok) return auth.response;
  const releaseId = String(auth.body?.releaseId || "");
  const action = String(auth.body?.action || "");
  if (!releaseId || !action) return json({ success: false, msg: "缺少版本 ID 或操作" }, 400);
  const catalog = await loadCatalog(env);
  const match = findRelease(catalog, releaseId);
  if (!match) return json({ success: false, msg: "版本不存在" }, 404);

  if (action === "latest") {
    for (const release of match.software.releases) release.isLatest = release.id === releaseId;
    match.release.status = "published";
  } else if (action === "toggle") {
    match.release.status = match.release.status === "disabled" ? "published" : "disabled";
  } else {
    return json({ success: false, msg: "未知操作" }, 400);
  }
  match.release.updatedAt = Date.now();
  match.software.updatedAt = Date.now();
  return success(await saveCatalog(env, catalog));
}

function findRelease(catalog, releaseId) {
  for (const software of catalog.software || []) {
    const release = software.releases?.find(item => item.id === releaseId);
    if (release) return { software, release };
  }
  return null;
}
