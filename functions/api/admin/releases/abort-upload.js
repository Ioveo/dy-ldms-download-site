import { json } from "../../../_lib/releases.js";
import { requireAdmin } from "../_lib.js";

export async function onRequestPost({ request, env }) {
  const auth = await requireAdmin(request, env);
  if (!auth.ok) return auth.response;

  const body = auth.body || {};
  const uploadId = String(body.uploadId || "");
  const fileKey = String(body.fileKey || "");

  if (!uploadId || !fileKey) {
    return json({ success: false, msg: "缺少上传参数" }, 400);
  }

  if (!env.SOFTWARE_BUCKET?.resumeMultipartUpload) {
    return json({ success: true, msg: "R2 未配置，跳过取消" });
  }

  try {
    const upload = env.SOFTWARE_BUCKET.resumeMultipartUpload(fileKey, uploadId);
    await upload.abort();
  } catch {
    // Abort errors are not critical
  }

  return json({ success: true, msg: "上传已取消" });
}
