import { loadCatalog, publicStorageAccount } from "../../_lib/catalog.js";
import { json } from "../../_lib/releases.js";
import { requireAdmin } from "./_lib.js";

export async function onRequestPost({ request, env }) {
  const auth = await requireAdmin(request, env);
  if (!auth.ok) return auth.response;
  const catalog = await loadCatalog(env);
  return json({ success: true, catalog: { ...catalog, storageAccounts: catalog.storageAccounts.map(publicStorageAccount) } });
}
