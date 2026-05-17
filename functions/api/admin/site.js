import { loadCatalog, normalizeSite, saveCatalog } from "../../_lib/catalog.js";
import { requireAdmin, success } from "./_lib.js";

export async function onRequestPost({ request, env }) {
  const auth = await requireAdmin(request, env);
  if (!auth.ok) return auth.response;
  const catalog = await loadCatalog(env);
  catalog.site = normalizeSite(auth.body || {});
  return success(await saveCatalog(env, catalog));
}
