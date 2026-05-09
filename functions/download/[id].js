import { findLatestRelease, loadManifest, serveRelease, text } from "../_lib/releases.js";

export async function onRequestGet({ env, params }) {
  const manifest = await loadManifest(env);
  const releaseId = params.id;
  const release = releaseId === "latest"
    ? findLatestRelease(manifest)
    : manifest.releases?.find(item => item.id === releaseId);

  if (!release) {
    return text("Release not found", 404);
  }

  return serveRelease(env, release);
}
