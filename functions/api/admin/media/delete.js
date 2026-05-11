import { json } from "../../../_lib/releases.js";
import { requireAdmin } from "../_lib.js";

export async function onRequestPost({ request, env }) {
  const auth = await requireAdmin(request, env);
  if (!auth.ok) return auth.response;
  if (!env.SOFTWARE_BUCKET?.delete) return json({ success: false, msg: "R2 delete 不可用" }, 500);
  const key = String(auth.body?.key || "");
  if (!key.startsWith("article-image-") && !key.startsWith("article-audio-")) return json({ success: false, msg: "只能删除文章媒体文件" }, 400);
  await env.SOFTWARE_BUCKET.delete(key);
  return json({ success: true });
}
