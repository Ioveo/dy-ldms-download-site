import { loadCatalog, saveCatalog } from "../../../_lib/catalog.js";
import { json } from "../../../_lib/releases.js";
import { requireAdmin, success } from "../_lib.js";

export async function onRequestPost({ request, env }) {
  const auth = await requireAdmin(request, env);
  if (!auth.ok) return auth.response;
  const releaseId = String(auth.body?.releaseId || "");
  if (!releaseId) return json({ success: false, msg: "缺少版本 ID" }, 400);
  const catalog = await loadCatalog(env);
  let found = false;
  for (const software of catalog.software || []) {
    const next = (software.releases || []).filter(release => release.id !== releaseId);
    if (next.length !== (software.releases || []).length) {
      software.releases = next;
      software.updatedAt = Date.now();
      found = true;
    }
  }
  if (!found) return json({ success: false, msg: "版本不存在" }, 404);
  return success(await saveCatalog(env, catalog));
}
