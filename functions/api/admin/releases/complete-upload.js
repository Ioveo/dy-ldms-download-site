import { formatBytes, id, loadCatalog, normalizeRelease, saveCatalog } from "../../../_lib/catalog.js";
import { saveAsset } from "../../../_lib/assets-db.js";
import { json } from "../../../_lib/releases.js";
import { requireAdmin, success } from "../_lib.js";

export async function onRequestPost({ request, env }) {
  const auth = await requireAdmin(request, env);
  if (!auth.ok) return auth.response;
  if (!env.SOFTWARE_BUCKET?.resumeMultipartUpload) {
    return json({ success: false, msg: "R2 未配置" }, 500);
  }

  const body = auth.body || {};
  const uploadId = String(body.uploadId || "");
  const fileKey = String(body.fileKey || "");
  const parts = body.parts;
  const softwareId = String(body.softwareId || "");
  const version = String(body.version || "").trim();
  const fileName = String(body.fileName || "").trim();
  const fileSize = Number(body.fileSize || 0);
  const changelog = String(body.changelog || "");
  const isLatest = body.isLatest === true || body.isLatest === "1";

  if (!uploadId || !fileKey || !Array.isArray(parts) || !parts.length) {
    return json({ success: false, msg: "缺少上传确认参数" }, 400);
  }
  if (!softwareId || !version) {
    return json({ success: false, msg: "缺少软件和版本信息" }, 400);
  }

  // Complete the R2 multipart upload
  try {
    const upload = env.SOFTWARE_BUCKET.resumeMultipartUpload(fileKey, uploadId);
    await upload.complete(parts.map(p => ({ partNumber: p.partNumber, etag: p.etag })));
  } catch (error) {
    return json({ success: false, msg: `完成上传失败: ${error.message || "未知错误"}` }, 500);
  }

  // Verify file exists and get actual size
  const head = await env.SOFTWARE_BUCKET.head(fileKey);
  if (!head) {
    return json({ success: false, msg: "上传的文件在 R2 中未找到" }, 500);
  }
  const actualSize = head.size || fileSize;

  // Update catalog
  const catalog = await loadCatalog(env);
  const software = catalog.software.find(item => item.id === softwareId);
  if (!software) return json({ success: false, msg: "软件不存在" }, 404);

  if (isLatest) {
    for (const release of software.releases) release.isLatest = false;
  }

  const releaseId = id("rel");
  const mimeType = contentTypeFor(fileName);

  const asset = await saveAsset(env, {
    storageId: "default",
    key: fileKey,
    kind: "software",
    mimeType,
    fileName,
    fileSize: actualSize,
    sha256: "",
    publicUrl: "",
    source: "chunked-upload",
    refType: "release",
    refId: releaseId
  });

  software.releases.unshift(normalizeRelease({
    id: releaseId,
    version,
    changelog,
    assetId: asset?.id || "",
    fileKey,
    storageId: "default",
    publicUrl: "",
    fileName,
    fileSize: actualSize,
    size: formatBytes(actualSize),
    sha256: "",
    isLatest,
    status: "published",
    createdAt: Date.now(),
    updatedAt: Date.now()
  }, software.slug));
  software.updatedAt = Date.now();

  return success(await saveCatalog(env, catalog));
}

function contentTypeFor(fileName) {
  const ext = String(fileName || "").toLowerCase().split(".").pop();
  return { zip: "application/zip", "7z": "application/x-7z-compressed", exe: "application/x-msdownload", msi: "application/x-msi" }[ext] || "application/octet-stream";
}
