import { loadCatalog } from "../../_lib/catalog.js";
import { requireAdmin, success } from "./_lib.js";

export async function onRequestPost({ request, env }) {
  const auth = await requireAdmin(request, env);
  if (!auth.ok) return auth.response;
  return success(await loadCatalog(env));
}
