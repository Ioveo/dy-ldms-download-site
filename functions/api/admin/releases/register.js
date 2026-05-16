import { formatBytes, id, loadCatalog, normalizeRelease, saveCatalog } from "../../../_lib/catalog.js";
import { saveAsset } from "../../../_lib/assets-db.js";
import { json } from "../../../_lib/releases.js";
import { requireAdmin, success } from "../_lib.js";

export async function onRequestPost({ request, env }) {
  const auth = await requireAdmin(request, env);
  if (!auth.ok) return auth.response;
  if (!env.SOFTWARE_BUCKET?.head) return json({ success: false, msg: "R2 未配置" }, 500);

  const body = auth.body || {};
  const softwareId = String(body.softwareId || "");
  const version = String(body.version || "").trim();
  const fileKey = normalizeKey(body.fileKey);
  if (!softwareId || !version || !fileKey) {
    return json({ success: false, msg: "请填写软件、版本号和 R2 文件路径" }, 400);
  }
  if (!isAllowedPackage(fileKey)) {
    return json({ success: false, msg: "安装包格式不支持，请使用 zip、7z、exe 或 msi 文件" }, 400);
  }

  const object = await env.SOFTWARE_BUCKET.head(fileKey);
  if (!object) return json({ success: false, msg: `R2 中找不到文件：${fileKey}` }, 404);

  const catalog = await loadCatalog(env);
  const software = catalog.software.find(item => item.id === softwareId);
  if (!software) return json({ success: false, msg: "软件不存在" }, 404);

  const fileName = sanitizeFileName(body.fileName || fileKey.split("/").pop());
  const fileSize = Number(body.fileSize || object.size || 0);
  const releaseId = id("rel");
  const asset = await saveAsset(env, {
    storageId: "default",
    bucket: env.SOFTWARE_BUCKET_NAME || "",
    key: fileKey,
    kind: "software",
    mimeType: object.httpMetadata?.contentType || "application/octet-stream",
    fileName,
    fileSize,
    sha256: String(body.sha256 || ""),
    source: "release-register",
    refType: "release",
    refId: releaseId
  });

  if (String(body.isLatest || "") === "1") {
    for (const release of software.releases) release.isLatest = false;
  }

  software.releases.unshift(normalizeRelease({
    id: releaseId,
    version,
    changelog: String(body.changelog || ""),
    assetId: asset?.id || "",
    fileKey,
    storageId: "default",
    fileName,
    fileSize,
    size: formatBytes(fileSize),
    sha256: String(body.sha256 || ""),
    isLatest: String(body.isLatest || "") === "1",
    status: "published",
    createdAt: Date.now(),
    updatedAt: Date.now()
  }, software.slug));
  software.updatedAt = Date.now();

  return success(await saveCatalog(env, catalog));
}

function normalizeKey(value) {
  return String(value || "").trim().replace(/^\/+/, "");
}

function sanitizeFileName(value) {
  return String(value || "download.bin").replace(/["\\\r\n]/g, "");
}

function isAllowedPackage(fileName) {
  const ext = String(fileName || "").toLowerCase().split(".").pop();
  return ["zip", "7z", "exe", "msi"].includes(ext);
}
