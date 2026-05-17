import { json } from "../../../_lib/releases.js";
import { requireAdmin } from "../_lib.js";

export async function onRequestPost({ request, env }) {
  const auth = await requireAdmin(request, env);
  if (!auth.ok) return auth.response;

  const accountId = env.CF_IMAGES_ACCOUNT_ID || env.CLOUDFLARE_ACCOUNT_ID || "";
  const apiToken = env.CF_IMAGES_API_TOKEN || "";
  const accountHash = env.CF_IMAGES_ACCOUNT_HASH || "";
  const variant = env.CF_IMAGES_VARIANT || "public";

  if (!accountId || !apiToken || !accountHash) {
    return json({ success: false, msg: "请配置 CF_IMAGES_ACCOUNT_ID、CF_IMAGES_API_TOKEN、CF_IMAGES_ACCOUNT_HASH" }, 500);
  }

  const body = auth.body || {};
  const form = new FormData();
  form.append("requireSignedURLs", String(Boolean(body.requireSignedURLs || false)));
  form.append("metadata", JSON.stringify({
    source: "download-site-gallery",
    fileName: String(body.fileName || ""),
    contentType: String(body.contentType || ""),
    createdAt: Date.now()
  }));

  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/images/v2/direct_upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiToken}` },
    body: form
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.success) {
    return json({ success: false, msg: result.errors?.[0]?.message || `Cloudflare Images 创建上传地址失败：HTTP ${response.status}` }, response.ok ? 400 : response.status);
  }

  const upload = result.result || {};
  const imageId = upload.id || upload.imageId || "";
  return json({
    success: true,
    imageId,
    uploadURL: upload.uploadURL || upload.uploadUrl || "",
    url: `https://imagedelivery.net/${accountHash}/${imageId}/${variant}`,
    variant
  });
}
