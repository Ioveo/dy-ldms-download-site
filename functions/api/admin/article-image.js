import { id } from "../../_lib/catalog.js";
import { json } from "../../_lib/releases.js";
import { requireAdmin } from "./_lib.js";

export async function onRequestPost({ request, env }) {
  const formData = await request.formData();
  const auth = await requireAdmin(request, env, formData);
  if (!auth.ok) return auth.response;
  if (!env.SOFTWARE_BUCKET?.put) return json({ success: false, msg: "R2 未配置" }, 500);

  const file = formData.get("file");
  if (!file?.arrayBuffer) return json({ success: false, msg: "请选择图片" }, 400);
  if (!String(file.type || "").startsWith("image/")) return json({ success: false, msg: "只能上传图片文件" }, 400);

  const fileName = sanitizeFileName(file.name || "article-image.png");
  const key = `${id("article-image")}-${fileName}`;
  await env.SOFTWARE_BUCKET.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type || "application/octet-stream" }
  });

  return json({ success: true, key, url: `/media/${encodeURIComponent(key)}` });
}

function sanitizeFileName(value) {
  return String(value || "image.png").replace(/["\\\r\n]/g, "").replace(/[^a-zA-Z0-9._-]/g, "-");
}
