import { id } from "../../_lib/catalog.js";
import { json } from "../../_lib/releases.js";
import { requireAdmin } from "./_lib.js";

export async function onRequestPost({ request, env }) {
  if (String(request.headers.get("Content-Type") || "").includes("application/json")) {
    return uploadJsonMedia(request, env);
  }

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
  if (mediaKind === "image" && file.size > 8 * 1024 * 1024) return json({ success: false, msg: "图片不能超过 8MB" }, 400);
  if (mediaKind === "audio" && file.size > 30 * 1024 * 1024) return json({ success: false, msg: "音频不能超过 30MB" }, 400);
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

async function uploadJsonMedia(request, env) {
  let body;
  try {
    body = await request.json();
  } catch (error) {
    return json({ success: false, msg: `读取上传数据失败：${error.message || "JSON 格式错误"}` }, 400);
  }

  if (!env.ADMIN_PASSWORD || String(body.password || "") !== env.ADMIN_PASSWORD) {
    return json({ success: false, msg: "密码错误或未配置 ADMIN_PASSWORD" }, 403);
  }
  if (!env.SOFTWARE_BUCKET?.put) return json({ success: false, msg: "R2 未配置或当前环境未绑定 SOFTWARE_BUCKET" }, 500);

  const fileName = sanitizeFileName(body.fileName || "article-media.bin");
  const type = String(body.contentType || inferredContentType(fileName) || "");
  const mediaKind = type.startsWith("audio/") ? "audio" : type.startsWith("image/") ? "image" : "";
  const kind = String(body.kind || "");
  if (!mediaKind) return json({ success: false, msg: "只能上传图片或音频文件" }, 400);
  if (kind === "image" && mediaKind !== "image") return json({ success: false, msg: "请选择图片文件" }, 400);
  if (kind === "audio" && mediaKind !== "audio") return json({ success: false, msg: "请选择音频文件" }, 400);
  if (!body.data) return json({ success: false, msg: "上传数据为空" }, 400);
  const approxSize = Math.floor(String(body.data).length * 0.75);
  if (mediaKind === "image" && approxSize > 8 * 1024 * 1024) return json({ success: false, msg: "图片不能超过 8MB" }, 400);
  if (mediaKind === "audio" && approxSize > 30 * 1024 * 1024) return json({ success: false, msg: "音频不能超过 30MB" }, 400);

  const folder = mediaKind === "audio" ? "article-audio" : "article-image";
  const key = `${id(folder)}-${fileName}`;
  try {
    await env.SOFTWARE_BUCKET.put(key, base64ToBytes(String(body.data || "")), {
      httpMetadata: { contentType: type || "application/octet-stream" }
    });
  } catch (error) {
    return json({ success: false, msg: `上传到 R2 失败：${error.message || "未知错误"}` }, 500);
  }

  return json({ success: true, key, url: `/media/${encodeURIComponent(key)}` });
}

function base64ToBytes(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
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
