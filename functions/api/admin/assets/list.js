import { listAssets } from "../../../_lib/assets-db.js";
import { json } from "../../../_lib/releases.js";
import { requireAdmin } from "../_lib.js";

export async function onRequestPost({ request, env }) {
  const auth = await requireAdmin(request, env);
  if (!auth.ok) return auth.response;
  const result = await listAssets(env, auth.body || {});
  if (!result) return json({ success: false, msg: "D1 未配置，资源管理不可用" }, 500);
  return json({ success: true, ...result });
}
