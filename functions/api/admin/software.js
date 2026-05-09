import { id, loadCatalog, normalizeSoftware, saveCatalog, slugify } from "../../_lib/catalog.js";
import { json } from "../../_lib/releases.js";
import { requireAdmin, success } from "./_lib.js";

export async function onRequestPost({ request, env }) {
  const auth = await requireAdmin(request, env);
  if (!auth.ok) return auth.response;
  const body = auth.body || {};
  if (!body.name || !body.slug) return json({ success: false, msg: "请填写软件名称和标识" }, 400);

  const catalog = await loadCatalog(env);
  const now = Date.now();
  const item = normalizeSoftware({
    id: body.id || id("soft"),
    categoryId: body.categoryId,
    name: body.name,
    slug: slugify(body.slug),
    description: body.description,
    coverUrl: body.coverUrl,
    sortOrder: body.sortOrder,
    status: body.status,
    createdAt: now,
    updatedAt: now,
    releases: []
  });

  const index = catalog.software.findIndex(entry => entry.id === item.id);
  if (index >= 0) {
    item.createdAt = catalog.software[index].createdAt;
    item.releases = catalog.software[index].releases || [];
    catalog.software[index] = item;
  } else {
    catalog.software.push(item);
  }

  return success(await saveCatalog(env, catalog));
}
