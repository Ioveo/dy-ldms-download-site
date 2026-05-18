import { id, loadCatalog, normalizePhotoWall, saveCatalog } from "../../_lib/catalog.js";
import { json } from "../../_lib/releases.js";
import { requireAdmin, success } from "./_lib.js";

export async function onRequestPost({ request, env }) {
  const auth = await requireAdmin(request, env);
  if (!auth.ok) return auth.response;
  const body = auth.body || {};
  const catalog = await loadCatalog(env);

  if (body.action === "delete") {
    catalog.photoWall = (catalog.photoWall || []).filter(item => item.id !== String(body.id || ""));
    return success(await saveCatalog(env, catalog));
  }

  if (!body.title || !body.imageUrl) return json({ success: false, msg: "请填写文字和图片地址" }, 400);
  const now = Date.now();
  const item = normalizePhotoWall([{
    id: body.id || id("photo-wall"),
    title: body.title,
    description: body.description,
    imageUrl: body.imageUrl,
    thumbUrl: body.thumbUrl || body.imageUrl,
    linkUrl: body.linkUrl,
    linkText: body.linkText,
    assetKey: body.assetKey,
    sortOrder: body.sortOrder,
    status: body.status,
    createdAt: now,
    updatedAt: now
  }])[0];

  const index = (catalog.photoWall || []).findIndex(entry => entry.id === item.id);
  if (index >= 0) {
    item.createdAt = catalog.photoWall[index].createdAt;
    catalog.photoWall[index] = item;
  } else {
    catalog.photoWall = catalog.photoWall || [];
    catalog.photoWall.push(item);
  }
  return success(await saveCatalog(env, catalog));
}
