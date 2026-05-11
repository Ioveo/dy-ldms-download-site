import { formatBytes, loadCatalog, saveCatalog, slugify } from "../../../_lib/catalog.js";
import { saveAsset } from "../../../_lib/assets-db.js";
import { decryptSecret } from "../../../_lib/crypto.js";
import { publicUrlFor, putExternalR2 } from "../../../_lib/r2-s3.js";
import { json } from "../../../_lib/releases.js";
import { requireAdmin, success } from "../_lib.js";

export async function onRequestPost({ request, env }) {
  const formData = await request.formData();
  const auth = await requireAdmin(request, env, formData);
  if (!auth.ok) return auth.response;
  if (!env.SOFTWARE_BUCKET?.put) return json({ success: false, msg: "R2 未配置" }, 500);

  const releaseId = String(formData.get("releaseId") || "");
  const file = formData.get("file");
  if (!releaseId || !file?.arrayBuffer) {
    return json({ success: false, msg: "请选择要替换的版本和安装包" }, 400);
  }

  const catalog = await loadCatalog(env);
  const match = findRelease(catalog, releaseId);
  if (!match) return json({ success: false, msg: "版本不存在" }, 404);

  const fileName = sanitizeFileName(file.name || match.release.fileName || `${match.software.slug}-${match.release.version}.zip`);
  if (!isAllowedPackage(fileName)) {
    return json({ success: false, msg: "安装包格式不支持，请上传 zip、7z、exe 或 msi 文件" }, 400);
  }
  if (file.size > 1024 * 1024 * 1024) {
    return json({ success: false, msg: "安装包不能超过 1GB" }, 400);
  }

  const bytes = await file.arrayBuffer();
  const sha256 = await sha256Hex(bytes);
  const storageId = match.release.storageId || "default";
  const fileKey = `software/${match.software.slug}/${slugify(match.release.version || "version")}/${Date.now()}-${fileName}`;
  let publicUrl = "";

  if (storageId === "default") {
    await env.SOFTWARE_BUCKET.put(fileKey, bytes, {
      httpMetadata: { contentType: file.type || "application/octet-stream" }
    });
  } else {
    const storage = catalog.storageAccounts.find(item => item.id === storageId && item.status !== "disabled");
    if (!storage) return json({ success: false, msg: "存储授权不存在或已停用" }, 404);
    const secret = await decryptSecret(env, storage.encryptedSecretAccessKey);
    await putExternalR2(storage, secret, fileKey, bytes, file.type || "application/octet-stream");
    publicUrl = publicUrlFor(storage, fileKey);
  }

  const asset = await saveAsset(env, {
    storageId,
    key: fileKey,
    kind: "software",
    mimeType: file.type || "application/octet-stream",
    fileName,
    fileSize: file.size || bytes.byteLength,
    sha256,
    publicUrl,
    source: "release-replace",
    refType: "release",
    refId: releaseId
  });

  match.release.assetId = asset?.id || match.release.assetId || "";
  match.release.fileKey = fileKey;
  match.release.publicUrl = publicUrl;
  match.release.fileName = fileName;
  match.release.fileSize = file.size || bytes.byteLength;
  match.release.size = formatBytes(file.size || bytes.byteLength);
  match.release.sha256 = sha256;
  match.release.status = "published";
  match.release.updatedAt = Date.now();
  match.software.updatedAt = Date.now();

  return success(await saveCatalog(env, catalog));
}

function findRelease(catalog, releaseId) {
  for (const software of catalog.software || []) {
    const release = software.releases?.find(item => item.id === releaseId);
    if (release) return { software, release };
  }
  return null;
}

function sanitizeFileName(value) {
  return String(value || "download.bin").replace(/["\\\r\n]/g, "");
}

function isAllowedPackage(fileName) {
  const ext = String(fileName || "").toLowerCase().split(".").pop();
  return ["zip", "7z", "exe", "msi"].includes(ext);
}

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest("SHA-256", value);
  return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, "0")).join("");
}
