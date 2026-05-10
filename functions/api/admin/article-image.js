import { id } from "../../_lib/catalog.js";
import { json } from "../../_lib/releases.js";
import { requireAdmin } from "./_lib.js";

export async function onRequestPost({ request, env }) {
  let formData;
  try {
    formData = await request.formData();
  } catch (error) {
    return json({ success: false, msg: `读取上传文件失败：${error.message || "表单格式错误"}` }, 400);
  }

  const auth = await requireAdmin(request, env, formData);
  if (!auth.ok) return auth.response;
  if (!env.SOFTWARE_BUCKET?.put) return json({ success: false, msg: "R2 未配置或当前环境未绑定 SOFTWARE_BUCKET" }, 500);

  const file = formData.get("file");
  if (!file?.arrayBuffer) return json({ success: false, msg: "请选择媒体文件" }, 400);
  const kind = String(formData.get("kind") || "");
  const type = String(file.type || inferredContentType(file.name) || "");
  const mediaKind = type.startsWith("audio/") ? "audio" : type.startsWith("image/") ? "image" : "";
  if (!mediaKind) return json({ success: false, msg: "只能上传图片或音频文件" }, 400);
  if (kind === "image" && mediaKind !== "image") return json({ success: false, msg: "请选择图片文件" }, 400);
  if (kind === "audio" && mediaKind !== "audio") return json({ success: false, msg: "请选择音频文件" }, 400);

  const fileName = sanitizeFileName(file.name || "article-media.bin");
  const folder = mediaKind === "audio" ? "article-audio" : "article-image";
  const key = `${id(folder)}-${fileName}`;
  try {
    await env.SOFTWARE_BUCKET.put(key, await file.arrayBuffer(), {
      httpMetadata: { contentType: type || "application/octet-stream" }
    });
  } catch (error) {
    return json({ success: false, msg: `上传到 R2 失败：${error.message || "未知错误"}` }, 500);
  }

  return json({ success: true, key, url: `/media/${encodeURIComponent(key)}` });
}

function sanitizeFileName(value) {
  return String(value || "image.png").replace(/["\\\r\n]/g, "").replace(/[^a-zA-Z0-9._-]/g, "-");
}

function inferredContentType(name) {
  const ext = String(name || "").toLowerCase().split(".").pop();
  return {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    avif: "image/avif",
    svg: "image/svg+xml",
    mp3: "audio/mpeg",
    m4a: "audio/mp4",
    aac: "audio/aac",
    wav: "audio/wav",
    ogg: "audio/ogg",
    oga: "audio/ogg",
    webm: "audio/webm",
    flac: "audio/flac"
  }[ext] || "";
}
