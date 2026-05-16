import { json } from "../../../_lib/releases.js";
import { requireAdminToken } from "../_lib.js";

export async function onRequestPost({ request, env }) {
  const auth = await requireAdminToken(request, env);
  if (!auth.ok) return auth.response;

  if (!env.SOFTWARE_BUCKET?.resumeMultipartUpload) {
    return json({ success: false, msg: "R2 未配置" }, 500);
  }

  const uploadId = request.headers.get("X-Upload-Id") || "";
  const fileKey = request.headers.get("X-File-Key") || "";
  const partNumber = Number(request.headers.get("X-Part-Number") || "0");

  if (!uploadId || !fileKey || partNumber < 1) {
    return json({ success: false, msg: "缺少分片参数" }, 400);
  }

  try {
    const upload = env.SOFTWARE_BUCKET.resumeMultipartUpload(fileKey, uploadId);
    const part = await upload.uploadPart(partNumber, request.body);
    return json({ success: true, partNumber, etag: part.etag });
  } catch (error) {
    return json({ success: false, msg: `分片上传失败: ${error.message || "未知错误"}` }, 500);
  }
}
