import { id, loadCatalog, normalizeMusic, saveCatalog } from "../../_lib/catalog.js";
import { json } from "../../_lib/releases.js";
import { requireAdmin, success } from "./_lib.js";

export async function onRequestPost({ request, env }) {
  const auth = await requireAdmin(request, env);
  if (!auth.ok) return auth.response;
  const body = auth.body || {};
  const catalog = await loadCatalog(env);

  if (body.action === "delete") {
    const musicId = String(body.id || "");
    catalog.music = (catalog.music || []).filter(item => item.id !== musicId);
    return success(await saveCatalog(env, catalog));
  }

  if (!body.title || !body.artist) {
    return json({ success: false, msg: "请填写歌曲名和歌手" }, 400);
  }
  if (!body.audioUrl && !body.neteaseId) {
    return json({ success: false, msg: "请填写音频地址或网易云音乐 ID" }, 400);
  }

  const now = Date.now();
  const item = normalizeMusic([{
    id: body.id || id("music"),
    title: body.title,
    artist: body.artist,
    album: body.album,
    neteaseId: body.neteaseId,
    audioUrl: body.audioUrl,
    coverUrl: body.coverUrl,
    lyric: body.lyric,
    tags: body.tags,
    featured: Boolean(body.featured),
    sortOrder: body.sortOrder,
    status: body.status,
    createdAt: now,
    updatedAt: now
  }])[0];

  const index = (catalog.music || []).findIndex(entry => entry.id === item.id);
  if (index >= 0) {
    item.createdAt = catalog.music[index].createdAt;
    catalog.music[index] = item;
  } else {
    catalog.music = catalog.music || [];
    catalog.music.push(item);
  }

  return success(await saveCatalog(env, catalog));
}
