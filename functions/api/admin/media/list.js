import { json } from "../../../_lib/releases.js";
import { requireAdmin } from "../_lib.js";

export async function onRequestPost({ request, env }) {
  const auth = await requireAdmin(request, env);
  if (!auth.ok) return auth.response;
  if (!env.SOFTWARE_BUCKET?.list) return json({ success: false, msg: "R2 list 不可用" }, 500);

  const type = String(auth.body?.type || "all");
  const prefixes = type === "image" ? ["article-image-"] : type === "audio" ? ["article-audio-"] : ["article-image-", "article-audio-"];
  const objects = [];
  for (const prefix of prefixes) {
    let cursor;
    do {
      const result = await env.SOFTWARE_BUCKET.list({ prefix, cursor, limit: 100 });
      objects.push(...(result.objects || []));
      cursor = result.truncated ? result.cursor : undefined;
    } while (cursor && objects.length < 500);
  }

  const media = objects
    .sort((a, b) => Number(b.uploaded || 0) - Number(a.uploaded || 0))
    .slice(0, 300)
    .map(object => ({
      key: object.key,
      url: `/media/${encodeURIComponent(object.key)}`,
      type: object.key.startsWith("article-audio-") ? "audio" : "image",
      size: object.size || 0,
      uploaded: object.uploaded ? new Date(object.uploaded).getTime() : 0,
      etag: object.etag || ""
    }));

  return json({ success: true, media });
}
