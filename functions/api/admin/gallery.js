import { id, loadCatalog, normalizeGallery, saveCatalog } from "../../_lib/catalog.js";
import { json } from "../../_lib/releases.js";
import { requireAdmin, success } from "./_lib.js";

export async function onRequestPost({ request, env }) {
  const auth = await requireAdmin(request, env);
  if (!auth.ok) return auth.response;
  const body = auth.body || {};
  const catalog = await loadCatalog(env);

  if (body.action === "delete") {
    const galleryId = String(body.id || "");
    catalog.gallery = (catalog.gallery || []).filter(item => item.id !== galleryId);
    return success(await saveCatalog(env, catalog));
  }

  if (!body.title || !body.imageUrl) {
    return json({ success: false, msg: "请填写标题和图片地址" }, 400);
  }

  const now = Date.now();
  const item = normalizeGallery([{
    id: body.id || id("gallery"),
    title: body.title,
    description: body.description,
    imageUrl: body.imageUrl,
    thumbUrl: body.thumbUrl || body.imageUrl,
    storageId: body.storageId,
    assetKey: body.assetKey,
    source: body.source,
    tags: body.tags,
    featured: Boolean(body.featured),
    sortOrder: body.sortOrder,
    status: body.status,
    createdAt: now,
    updatedAt: now
  }])[0];

  const index = (catalog.gallery || []).findIndex(entry => entry.id === item.id);
  if (index >= 0) {
    item.createdAt = catalog.gallery[index].createdAt;
    catalog.gallery[index] = item;
  } else {
    catalog.gallery = catalog.gallery || [];
    catalog.gallery.push(item);
  }

  return success(await saveCatalog(env, catalog));
}
