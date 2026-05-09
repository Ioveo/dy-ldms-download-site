import { findLatestRelease, loadCatalog } from "../../_lib/catalog.js";
import { serveRelease, text } from "../../_lib/releases.js";

export async function onRequestGet({ env, params }) {
  const match = findLatestRelease(await loadCatalog(env), params.software);
  if (!match?.release?.fileKey) return text("Release not found", 404);
  return serveRelease(env, {
    key: match.release.fileKey,
    fileName: match.release.fileName,
    size: match.release.size,
    sha256: match.release.sha256
  });
}
