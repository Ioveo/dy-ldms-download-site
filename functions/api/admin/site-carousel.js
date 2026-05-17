import { id, loadCatalog, normalizeSiteCarousel, saveCatalog } from "../../_lib/catalog.js";
import { json } from "../../_lib/releases.js";
import { requireAdmin, success } from "./_lib.js";

export async function onRequestPost({ request, env }) {
  const auth = await requireAdmin(request, env);
  if (!auth.ok) return auth.response;
  const body = auth.body || {};
  const catalog = await loadCatalog(env);

  if (body.action === "delete") {
    catalog.siteCarousel = (catalog.siteCarousel || []).filter(item => item.id !== String(body.id || ""));
    return success(await saveCatalog(env, catalog));
  }

  if (!body.title || !body.imageUrl) return json({ success: false, msg: "请填写标题和图片地址" }, 400);
  const now = Date.now();
  const item = normalizeSiteCarousel([{
    id: body.id || id("carousel"),
    title: body.title,
    description: body.description,
    imageUrl: body.imageUrl,
    thumbUrl: body.thumbUrl || body.imageUrl,
    suggestion: body.suggestion,
    sortOrder: body.sortOrder,
    status: body.status,
    createdAt: now,
    updatedAt: now
  }])[0];

  const index = (catalog.siteCarousel || []).findIndex(entry => entry.id === item.id);
  if (index >= 0) {
    item.createdAt = catalog.siteCarousel[index].createdAt;
    catalog.siteCarousel[index] = item;
  } else {
    catalog.siteCarousel = catalog.siteCarousel || [];
    catalog.siteCarousel.push(item);
  }
  return success(await saveCatalog(env, catalog));
}
