import { publicAssetUrl, saveAsset } from "../../../_lib/assets-db.js";
import { decryptSecret } from "../../../_lib/crypto.js";
import { id, loadCatalog, slugify } from "../../../_lib/catalog.js";
import { publicUrlFor, putExternalR2 } from "../../../_lib/r2-s3.js";
import { json } from "../../../_lib/releases.js";
import { requireAdmin } from "../_lib.js";

const LIMITS = {
  image: 8 * 1024 * 1024,
  audio: 50 * 1024 * 1024,
  software: 1024 * 1024 * 1024,
  site: 8 * 1024 * 1024,
  other: 30 * 1024 * 1024
};

export async function onRequestPost({ request, env }) {
  if (String(request.headers.get("Content-Type") || "").includes("application/json")) {
    return uploadJsonAsset(request, env);
  }

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return json({ success: false, msg: "读取上传文件失败" }, 400);
  }

  const auth = await requireAdmin(request, env, formData);
  if (!auth.ok) return auth.response;

  const file = formData.get("file");
  if (!file?.arrayBuffer) return json({ success: false, msg: "请选择文件" }, 400);
  const input = {
    storageId: String(formData.get("storageId") || "default"),
    kind: String(formData.get("kind") || "other"),
    folder: String(formData.get("folder") || ""),
    refType: String(formData.get("refType") || ""),
    refId: String(formData.get("refId") || ""),
    source: "manual-upload",
    fileName: file.name || "asset.bin",
    contentType: file.type || "",
    bytes: await file.arrayBuffer()
  };
  return saveUploadedAsset(env, input);
}

async function uploadJsonAsset(request, env) {
  const auth = await requireAdmin(request, env);
  if (!auth.ok) return auth.response;
  const body = auth.body || {};
  if (!body.data) return json({ success: false, msg: "上传数据为空" }, 400);
  return saveUploadedAsset(env, {
    storageId: String(body.storageId || "default"),
    kind: String(body.kind || "other"),
    folder: String(body.folder || ""),
    refType: String(body.refType || ""),
    refId: String(body.refId || ""),
    source: String(body.source || "manual-upload"),
    fileName: body.fileName || "asset.bin",
    contentType: body.contentType || "",
    bytes: base64ToBytes(String(body.data || ""))
  });
}

async function saveUploadedAsset(env, input) {
  const fileName = sanitizeFileName(input.fileName || "asset.bin");
  const contentType = String(input.contentType || inferredContentType(fileName) || "application/octet-stream");
  const kind = normalizeKind(input.kind, fileName, contentType);
  if (!kind) return json({ success: false, msg: "文件类型不支持" }, 400);

  const bytes = toArrayBuffer(input.bytes);
  if (bytes.byteLength > (LIMITS[kind] || LIMITS.other)) return json({ success: false, msg: "文件超过允许大小" }, 400);

  const storageId = String(input.storageId || "default");
  const key = keyFor(kind, String(input.folder || ""), fileName);
  const sha256 = await sha256Hex(bytes);
  let bucket = env.SOFTWARE_BUCKET_NAME || "";
  let publicUrl = "";

  if (storageId === "default") {
    if (!env.SOFTWARE_BUCKET?.put) return json({ success: false, msg: "R2 未配置" }, 500);
    await env.SOFTWARE_BUCKET.put(key, bytes, { httpMetadata: { contentType } });
  } else {
    const catalog = await loadCatalog(env);
    const storage = catalog.storageAccounts.find(item => item.id === storageId && item.status !== "disabled");
    if (!storage) return json({ success: false, msg: "存储授权不存在或已停用" }, 404);
    const secret = await decryptSecret(env, storage.encryptedSecretAccessKey);
    await putExternalR2(storage, secret, key, bytes, contentType);
    bucket = storage.bucket;
    publicUrl = publicUrlFor(storage, key);
  }

  const asset = await saveAsset(env, {
    storageId,
    bucket,
    key,
    kind,
    mimeType: contentType,
    fileName,
    fileSize: bytes.byteLength,
    sha256,
    publicUrl,
    source: input.source,
    refType: input.refType,
    refId: input.refId
  });
  if (!asset) return json({ success: false, msg: "D1 未配置，资源记录保存失败" }, 500);
  return json({ success: true, asset: withAssetUrl(asset) });
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

function base64ToBytes(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function toArrayBuffer(value) {
  if (value instanceof ArrayBuffer) return value;
  if (ArrayBuffer.isView(value)) return value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength);
  return new Uint8Array(value || []).buffer;
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
    ico: "image/x-icon",
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

function withAssetUrl(asset) {
  if (asset.storageId && asset.storageId !== "default" && !asset.publicUrl) return { ...asset, url: "" };
  return { ...asset, url: publicAssetUrl(asset) };
}

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest("SHA-256", value);
  return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, "0")).join("");
}
