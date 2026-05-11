import { formatBytes, id, loadCatalog, normalizeRelease, saveCatalog, slugify } from "../../_lib/catalog.js";
import { decryptSecret } from "../../_lib/crypto.js";
import { publicUrlFor, putExternalR2 } from "../../_lib/r2-s3.js";
import { json } from "../../_lib/releases.js";
import { requireAdmin, success } from "./_lib.js";

export async function onRequestPost({ request, env }) {
  const formData = await request.formData();
  const auth = await requireAdmin(request, env, formData);
  if (!auth.ok) return auth.response;
  if (!env.SOFTWARE_BUCKET?.put) return json({ success: false, msg: "R2 未配置" }, 500);

  const softwareId = String(formData.get("softwareId") || "");
  const storageId = String(formData.get("storageId") || "default");
  const version = String(formData.get("version") || "").trim();
  const file = formData.get("file");
  if (!softwareId || !version || !file?.arrayBuffer) {
    return json({ success: false, msg: "请填写版本并选择文件" }, 400);
  }

  const catalog = await loadCatalog(env);
  const software = catalog.software.find(item => item.id === softwareId);
  if (!software) return json({ success: false, msg: "软件不存在" }, 404);

  const fileName = sanitizeFileName(file.name || `${software.slug}-${version}.zip`);
  if (!isAllowedPackage(fileName, file.type)) {
    return json({ success: false, msg: "安装包格式不支持，请上传 zip、7z、exe 或 msi 文件" }, 400);
  }
  if (file.size > 1024 * 1024 * 1024) {
    return json({ success: false, msg: "安装包不能超过 1GB" }, 400);
  }
  const fileKey = `software/${software.slug}/${slugify(version)}/${Date.now()}-${fileName}`;
  const bytes = await file.arrayBuffer();
  const sha256 = await sha256Hex(bytes);
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

  const isLatest = String(formData.get("isLatest") || "") === "1";
  if (isLatest) {
    for (const release of software.releases) release.isLatest = false;
  }

  software.releases.unshift(normalizeRelease({
    id: id("rel"),
    version,
    changelog: String(formData.get("changelog") || ""),
    fileKey,
    storageId,
    publicUrl,
    fileName,
    fileSize: file.size || bytes.byteLength,
    size: formatBytes(file.size || bytes.byteLength),
    sha256,
    isLatest,
    status: "published",
    createdAt: Date.now(),
    updatedAt: Date.now()
  }, software.slug));
  software.updatedAt = Date.now();

  return success(await saveCatalog(env, catalog));
}

function sanitizeFileName(value) {
  return String(value || "download.bin").replace(/["\\\r\n]/g, "");
}

function isAllowedPackage(fileName, contentType) {
  const ext = String(fileName || "").toLowerCase().split(".").pop();
  return ["zip", "7z", "exe", "msi"].includes(ext);
}

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest("SHA-256", value);
  return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, "0")).join("");
}
