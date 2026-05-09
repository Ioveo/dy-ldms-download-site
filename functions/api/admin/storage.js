import { id, loadCatalog, publicStorageAccount, saveCatalog } from "../../_lib/catalog.js";
import { encryptSecret } from "../../_lib/crypto.js";
import { json } from "../../_lib/releases.js";
import { requireAdmin } from "./_lib.js";

export async function onRequestPost({ request, env }) {
  const auth = await requireAdmin(request, env);
  if (!auth.ok) return auth.response;
  const body = auth.body || {};
  if (!body.name || !body.accountId || !body.bucket || !body.accessKeyId) {
    return json({ success: false, msg: "请填写名称、Account ID、Bucket 和 Access Key" }, 400);
  }

  const catalog = await loadCatalog(env);
  const existing = catalog.storageAccounts.find(item => item.id === body.id);
  const now = Date.now();
  const account = {
    id: body.id || id("storage"),
    name: String(body.name),
    provider: "cloudflare-r2",
    accountId: String(body.accountId),
    bucket: String(body.bucket),
    region: String(body.region || "auto"),
    endpoint: String(body.endpoint || ""),
    accessKeyId: String(body.accessKeyId),
    encryptedSecretAccessKey: body.secretAccessKey
      ? await encryptSecret(env, String(body.secretAccessKey))
      : existing?.encryptedSecretAccessKey || "",
    publicBaseUrl: String(body.publicBaseUrl || ""),
    status: body.status || "active",
    sortOrder: Number(body.sortOrder || 0),
    createdAt: existing?.createdAt || now,
    updatedAt: now
  };

  const index = catalog.storageAccounts.findIndex(item => item.id === account.id);
  if (index >= 0) catalog.storageAccounts[index] = account;
  else catalog.storageAccounts.push(account);
  const saved = await saveCatalog(env, catalog);
  return json({ success: true, catalog: { ...saved, storageAccounts: saved.storageAccounts.map(publicStorageAccount) } });
}
