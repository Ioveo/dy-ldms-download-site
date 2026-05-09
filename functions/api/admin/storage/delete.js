import { loadCatalog, publicStorageAccount, saveCatalog } from "../../../_lib/catalog.js";
import { json } from "../../../_lib/releases.js";
import { requireAdmin } from "../_lib.js";

export async function onRequestPost({ request, env }) {
  const auth = await requireAdmin(request, env);
  if (!auth.ok) return auth.response;
  const id = String(auth.body?.id || "");
  if (!id) return json({ success: false, msg: "缺少存储账户 ID" }, 400);
  const catalog = await loadCatalog(env);
  const inUse = catalog.software.some(item => item.releases.some(release => release.storageId === id));
  if (inUse) return json({ success: false, msg: "该存储账户已有版本使用，不能删除" }, 400);
  catalog.storageAccounts = catalog.storageAccounts.filter(item => item.id !== id);
  const saved = await saveCatalog(env, catalog);
  return json({ success: true, catalog: { ...saved, storageAccounts: saved.storageAccounts.map(publicStorageAccount) } });
}
