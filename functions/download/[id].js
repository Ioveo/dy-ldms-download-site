import { findLatestRelease, loadManifest, serveRelease, text } from "../_lib/releases.js";
import { findLatestRelease as findLatestCatalogRelease, findRelease, loadCatalog } from "../_lib/catalog.js";
import { incrementReleaseDownload } from "../_lib/download-stats.js";

export async function onRequestGet({ env, params }) {
  const catalog = await loadCatalog(env);
  const manifest = await loadManifest(env);
  const releaseId = params.id;

  const catalogMatch = releaseId === "latest"
    ? findLatestCatalogRelease(catalog, "datacenter") || findLatestCatalogRelease(catalog, catalog.software?.[0]?.slug)
    : findRelease(catalog, releaseId);
  if (catalogMatch?.release?.fileKey && catalogMatch.release.status === "published") {
    await incrementReleaseDownload(env, catalogMatch.release.id);
    if (catalogMatch.release.storageId !== "default" && catalogMatch.release.publicUrl) {
      return Response.redirect(catalogMatch.release.publicUrl, 302);
    }
    return serveRelease(env, {
      key: catalogMatch.release.fileKey,
      fileName: catalogMatch.release.fileName,
      size: catalogMatch.release.size,
      sha256: catalogMatch.release.sha256
    });
  }

  const release = releaseId === "latest"
    ? findLatestRelease(manifest)
    : manifest.releases?.find(item => item.id === releaseId);

  if (!release) {
    return text("Release not found", 404);
  }

  return serveRelease(env, release);
}
