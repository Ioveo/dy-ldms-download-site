import { json } from "../_lib/releases.js";
import { loadCatalog, publicCatalog } from "../_lib/catalog.js";

export async function onRequestGet({ env }) {
  return json(publicCatalog(await loadCatalog(env)));
}
