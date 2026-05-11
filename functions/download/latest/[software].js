import { findLatestRelease, loadCatalog, saveCatalog } from "../../_lib/catalog.js";
import { serveRelease, text } from "../../_lib/releases.js";

export async function onRequestGet({ env, params }) {
  const catalog = await loadCatalog(env);
  const match = findLatestRelease(catalog, params.software);
  if (!match?.release?.fileKey) return text("Release not found", 404);
  await incrementDownload(env, catalog, match.release.id);
  if (match.release.storageId !== "default" && match.release.publicUrl) {
    return Response.redirect(match.release.publicUrl, 302);
  }
  return serveRelease(env, {
    key: match.release.fileKey,
    fileName: match.release.fileName,
    size: match.release.size,
    sha256: match.release.sha256
  });
}

async function incrementDownload(env, catalog, releaseId) {
  for (const software of catalog.software || []) {
    const release = software.releases?.find(item => item.id === releaseId);
    if (release) {
      release.downloadCount = Number(release.downloadCount || 0) + 1;
      release.updatedAt = Date.now();
      await saveCatalog(env, catalog);
      return;
    }
  }
}
