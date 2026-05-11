import { decryptSecret } from "../../../_lib/crypto.js";
import { loadCatalog } from "../../../_lib/catalog.js";
import { putExternalR2 } from "../../../_lib/r2-s3.js";
import { json } from "../../../_lib/releases.js";
import { requireAdmin } from "../_lib.js";

export async function onRequestPost({ request, env }) {
  const auth = await requireAdmin(request, env);
  if (!auth.ok) return auth.response;
  if (!env.STORAGE_SECRET && auth.body?.id && !auth.body?.secretAccessKey) return json({ success: false, msg: "请先配置 STORAGE_SECRET，或输入 Secret 后再测试" }, 500);
  const body = auth.body || {};
  let account = {
    id: body.id || "test",
    name: body.name || "R2 Test",
    provider: "cloudflare-r2",
    accountId: body.accountId,
    bucket: body.bucket,
    region: body.region || "auto",
    endpoint: body.endpoint || "",
    accessKeyId: body.accessKeyId,
    publicBaseUrl: body.publicBaseUrl || ""
  };
  let secret = body.secretAccessKey || "";

  if (!secret && body.id) {
    const catalog = await loadCatalog(env);
    const saved = catalog.storageAccounts.find(item => item.id === body.id);
    if (saved) {
      account = { ...saved, ...account, accessKeyId: body.accessKeyId || saved.accessKeyId };
      secret = await decryptSecret(env, saved.encryptedSecretAccessKey);
    }
  }

  if (!account.accountId || !account.bucket || !account.accessKeyId || !secret) {
    return json({ success: false, msg: "请填写 Account ID、Bucket、Access Key 和 Secret" }, 400);
  }

  try {
    const key = `connection-tests/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.txt`;
    await putExternalR2(account, secret, key, new TextEncoder().encode("TianCaiMao R2 connection test"), "text/plain; charset=utf-8");
    return json({ success: true, msg: "连接测试成功，测试文件已上传", key });
  } catch (error) {
    return json({ success: false, msg: error?.message || "连接测试失败" }, 400);
  }
}
