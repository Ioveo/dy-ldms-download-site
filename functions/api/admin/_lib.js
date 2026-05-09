import { json } from "../../_lib/releases.js";

export async function requireAdmin(request, env, formData = null) {
  let password = "";
  let body = null;

  if (formData) {
    password = String(formData.get("password") || "");
  } else {
    try {
      body = await request.json();
      password = String(body.password || "");
    } catch {
      body = {};
    }
  }

  if (!env.ADMIN_PASSWORD || password !== env.ADMIN_PASSWORD) {
    return { ok: false, response: json({ success: false, msg: "密码错误或未配置 ADMIN_PASSWORD" }, 403) };
  }

  return { ok: true, body };
}

export function success(catalog, extra = {}) {
  return json({ success: true, catalog, ...extra });
}
