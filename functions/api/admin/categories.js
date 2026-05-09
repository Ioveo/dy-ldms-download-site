import { id, loadCatalog, saveCatalog, slugify } from "../../_lib/catalog.js";
import { json } from "../../_lib/releases.js";
import { requireAdmin, success } from "./_lib.js";

export async function onRequestPost({ request, env }) {
  const auth = await requireAdmin(request, env);
  if (!auth.ok) return auth.response;
  const body = auth.body || {};
  if (!body.name || !body.slug) return json({ success: false, msg: "请填写分类名称和标识" }, 400);
  const catalog = await loadCatalog(env);
  const category = {
    id: body.id || id("cat"),
    name: String(body.name),
    slug: slugify(body.slug),
    sortOrder: Number(body.sortOrder || 0),
    status: body.status || "active"
  };
  const index = catalog.categories.findIndex(item => item.id === category.id);
  if (index >= 0) catalog.categories[index] = category;
  else catalog.categories.push(category);
  return success(await saveCatalog(env, catalog));
}
