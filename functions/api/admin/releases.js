import { formatBytes, id, loadCatalog, normalizeRelease, saveCatalog, slugify } from "../../_lib/catalog.js";
import { json } from "../../_lib/releases.js";
import { requireAdmin, success } from "./_lib.js";

export async function onRequestPost({ request, env }) {
  const formData = await request.formData();
  const auth = await requireAdmin(request, env, formData);
  if (!auth.ok) return auth.response;
  if (!env.SOFTWARE_BUCKET?.put) return json({ success: false, msg: "R2 未配置" }, 500);

  const softwareId = String(formData.get("softwareId") || "");
  const version = String(formData.get("version") || "").trim();
  const file = formData.get("file");
  if (!softwareId || !version || !file?.arrayBuffer) {
    return json({ success: false, msg: "请填写版本并选择文件" }, 400);
  }

  const catalog = await loadCatalog(env);
  const software = catalog.software.find(item => item.id === softwareId);
  if (!software) return json({ success: false, msg: "软件不存在" }, 404);

  const fileName = sanitizeFileName(file.name || `${software.slug}-${version}.zip`);
  const fileKey = `software/${software.slug}/${slugify(version)}/${Date.now()}-${fileName}`;
  const bytes = await file.arrayBuffer();
  await env.SOFTWARE_BUCKET.put(fileKey, bytes, {
    httpMetadata: { contentType: file.type || "application/octet-stream" }
  });

  const isLatest = String(formData.get("isLatest") || "") === "1";
  if (isLatest) {
    for (const release of software.releases) release.isLatest = false;
  }

  software.releases.unshift(normalizeRelease({
    id: id("rel"),
    version,
    changelog: String(formData.get("changelog") || ""),
    fileKey,
    fileName,
    fileSize: file.size || bytes.byteLength,
    size: formatBytes(file.size || bytes.byteLength),
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
