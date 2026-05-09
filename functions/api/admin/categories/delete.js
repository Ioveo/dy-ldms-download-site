import { loadCatalog, saveCatalog } from "../../../_lib/catalog.js";
import { json } from "../../../_lib/releases.js";
import { requireAdmin, success } from "../_lib.js";

export async function onRequestPost({ request, env }) {
  const auth = await requireAdmin(request, env);
  if (!auth.ok) return auth.response;
  const id = String(auth.body?.id || "");
  if (!id) return json({ success: false, msg: "缺少分类 ID" }, 400);
  const catalog = await loadCatalog(env);
  if (catalog.software.some(item => item.categoryId === id)) {
    return json({ success: false, msg: "该分类下还有软件，不能删除" }, 400);
  }
  catalog.categories = catalog.categories.filter(item => item.id !== id);
  return success(await saveCatalog(env, catalog));
}
