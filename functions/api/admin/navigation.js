import { id, loadCatalog, saveCatalog } from "../../_lib/catalog.js";
import { json } from "../../_lib/releases.js";
import { requireAdmin, success } from "./_lib.js";

export async function onRequestPost({ request, env }) {
  const auth = await requireAdmin(request, env);
  if (!auth.ok) return auth.response;
  const body = auth.body || {};
  if (!body.label || !body.href) return json({ success: false, msg: "请填写导航名称和链接" }, 400);
  const catalog = await loadCatalog(env);
  const item = {
    id: body.id || id("nav"),
    label: String(body.label),
    href: String(body.href),
    sortOrder: Number(body.sortOrder || 0),
    status: body.status || "active",
    external: Boolean(body.external)
  };
  const index = catalog.navigation.findIndex(entry => entry.id === item.id);
  if (index >= 0) catalog.navigation[index] = item;
  else catalog.navigation.push(item);
  return success(await saveCatalog(env, catalog));
}
