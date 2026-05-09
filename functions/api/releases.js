import { json, loadManifest } from "../_lib/releases.js";

export async function onRequestGet({ env }) {
  return json(await loadManifest(env));
}
