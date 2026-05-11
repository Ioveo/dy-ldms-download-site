import { findLatestRelease, isDownloadableRelease, loadCatalog } from "../../_lib/catalog.js";
import { incrementReleaseDownload } from "../../_lib/download-stats.js";
import { serveRelease, text } from "../../_lib/releases.js";

export async function onRequestGet({ env, params }) {
  const catalog = await loadCatalog(env);
  const match = findLatestRelease(catalog, params.software);
  if (!match?.release?.fileKey || !isDownloadableRelease(match.release)) return text("Release not found", 404);
  await incrementReleaseDownload(env, match.release.id);
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
