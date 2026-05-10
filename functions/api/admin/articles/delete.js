import { loadCatalog, saveCatalog } from "../../../_lib/catalog.js";
import { json } from "../../../_lib/releases.js";
import { requireAdmin, success } from "../_lib.js";

export async function onRequestPost({ request, env }) {
  const auth = await requireAdmin(request, env);
  if (!auth.ok) return auth.response;
  const id = String(auth.body?.id || "");
  if (!id) return json({ success: false, msg: "缺少文章 ID" }, 400);
  const catalog = await loadCatalog(env);
  catalog.articles = catalog.articles.filter(item => item.id !== id);
  return success(await saveCatalog(env, catalog));
}
