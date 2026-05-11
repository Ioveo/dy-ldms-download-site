import { saveAsset } from "../../../_lib/assets-db.js";
import { id, slugify } from "../../../_lib/catalog.js";
import { json } from "../../../_lib/releases.js";
import { requireAdmin } from "../_lib.js";

const LIMITS = { image: 8 * 1024 * 1024, audio: 50 * 1024 * 1024, software: 1024 * 1024 * 1024, site: 8 * 1024 * 1024, other: 30 * 1024 * 1024 };

export async function onRequestPost({ request, env }) {
  const formData = await request.formData();
  const auth = await requireAdmin(request, env, formData);
  if (!auth.ok) return auth.response;
  if (!env.SOFTWARE_BUCKET?.put) return json({ success: false, msg: "R2 未配置" }, 500);

  const file = formData.get("file");
  if (!file?.arrayBuffer) return json({ success: false, msg: "请选择文件" }, 400);
  const requestedKind = String(formData.get("kind") || "other");
  const kind = normalizeKind(requestedKind, file.name, file.type);
  if (!kind) return json({ success: false, msg: "文件类型不支持" }, 400);
  if (file.size > (LIMITS[kind] || LIMITS.other)) return json({ success: false, msg: "文件超过允许大小" }, 400);

  const fileName = sanitizeFileName(file.name || "asset.bin");
  const key = keyFor(kind, String(formData.get("folder") || ""), fileName);
  const bytes = await file.arrayBuffer();
  const sha256 = await sha256Hex(bytes);
  await env.SOFTWARE_BUCKET.put(key, bytes, { httpMetadata: { contentType: file.type || "application/octet-stream" } });

  const asset = await saveAsset(env, {
    storageId: "default",
    bucket: env.SOFTWARE_BUCKET_NAME || "",
    key,
    kind,
    mimeType: file.type || "application/octet-stream",
    fileName,
    fileSize: file.size || bytes.byteLength,
    sha256,
    source: "manual-upload",
    refType: String(formData.get("refType") || ""),
    refId: String(formData.get("refId") || "")
  });
  if (!asset) return json({ success: false, msg: "D1 未配置，资源记录保存失败" }, 500);
  return json({ success: true, asset });
}

function normalizeKind(kind, name, type) {
  const ext = String(name || "").toLowerCase().split(".").pop();
  if (String(type || "").toLowerCase() === "image/svg+xml" || ext === "svg") return "";
  if (kind === "image" && ["png", "jpg", "jpeg", "gif", "webp", "avif"].includes(ext)) return "image";
  if (kind === "audio" && ["mp3", "m4a", "aac", "wav", "ogg", "oga", "webm", "flac"].includes(ext)) return "audio";
  if (kind === "software" && ["zip", "7z", "exe", "msi"].includes(ext)) return "software";
  if (kind === "site" && ["png", "jpg", "jpeg", "gif", "webp", "avif", "ico"].includes(ext)) return "site";
  if (kind === "other") return "other";
  return "";
}

function keyFor(kind, folder, fileName) {
  const safeFolder = slugify(folder || kind);
  const ym = new Date().toISOString().slice(0, 7).replace("-", "/");
  if (kind === "software") return `software/manual/${Date.now()}-${fileName}`;
  if (kind === "site") return `site/${safeFolder}/${Date.now()}-${fileName}`;
  if (kind === "audio") return `media/audio/${ym}/${id("audio")}-${fileName}`;
  if (kind === "image") return `media/images/${ym}/${id("image")}-${fileName}`;
  return `media/other/${ym}/${id("asset")}-${fileName}`;
}

function sanitizeFileName(value) {
  return String(value || "asset.bin").replace(/["\\\r\n]/g, "").replace(/[^a-zA-Z0-9._-]/g, "-");
}

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest("SHA-256", value);
  return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, "0")).join("");
}
