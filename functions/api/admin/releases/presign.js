import { loadCatalog, slugify } from "../../../_lib/catalog.js";
import { json } from "../../../_lib/releases.js";
import { requireAdmin } from "../_lib.js";

export async function onRequestPost({ request, env }) {
  const auth = await requireAdmin(request, env);
  if (!auth.ok) return auth.response;
  if (!env.SOFTWARE_BUCKET?.createMultipartUpload) {
    return json({ success: false, msg: "R2 未配置或不支持分片上传" }, 500);
  }

  const body = auth.body || {};
  const softwareId = String(body.softwareId || "");
  const version = String(body.version || "").trim();
  const rawFileName = String(body.fileName || "");
  const fileSize = Number(body.fileSize || 0);

  if (!softwareId || !version || !rawFileName) {
    return json({ success: false, msg: "请填写软件、版本号和文件名" }, 400);
  }

  const fileName = sanitizeFileName(rawFileName);
  if (!isAllowedPackage(fileName)) {
    return json({ success: false, msg: "安装包格式不支持，请上传 zip、7z、exe 或 msi 文件" }, 400);
  }
  if (fileSize > 5 * 1024 * 1024 * 1024) {
    return json({ success: false, msg: "安装包不能超过 5GB" }, 400);
  }

  const catalog = await loadCatalog(env);
  const software = catalog.software.find(item => item.id === softwareId);
  if (!software) return json({ success: false, msg: "软件不存在" }, 404);

  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
  const fileKey = `software/${software.slug}/${slugify(version)}/${Date.now()}-${safeName}`;

  const multipart = await env.SOFTWARE_BUCKET.createMultipartUpload(fileKey, {
    httpMetadata: { contentType: contentTypeFor(fileName) }
  });

  return json({
    success: true,
    uploadId: multipart.uploadId,
    fileKey
  });
}

function sanitizeFileName(value) {
  return String(value || "download.bin").replace(/["\\\\\\r\\n]/g, "");
}

function isAllowedPackage(fileName) {
  const ext = String(fileName || "").toLowerCase().split(".").pop();
  return ["zip", "7z", "exe", "msi"].includes(ext);
}

function contentTypeFor(fileName) {
  const ext = String(fileName || "").toLowerCase().split(".").pop();
  return { zip: "application/zip", "7z": "application/x-7z-compressed", exe: "application/x-msdownload", msi: "application/x-msi" }[ext] || "application/octet-stream";
}
