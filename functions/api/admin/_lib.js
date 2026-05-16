import { json } from "../../_lib/releases.js";

const TOKEN_TTL_MS = 2 * 60 * 60 * 1000;

export async function requireAdmin(request, env, formData = null) {
  const token = formData ? String(formData.get("token") || "") : request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") || "";
  if (token) {
    if (await verifyAdminToken(env, token)) return { ok: true, body: formData ? null : await readJson(request) };
    return { ok: false, response: json({ success: false, msg: "登录已过期，请重新登录" }, 403) };
  }

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

export async function loginAdmin(request, env) {
  const body = await readJson(request);
  const password = String(body.password || "");
  if (!env.ADMIN_PASSWORD || password !== env.ADMIN_PASSWORD) {
    return json({ success: false, msg: "密码错误或未配置 ADMIN_PASSWORD" }, 403);
  }
  return json({ success: true, token: await createAdminToken(env), expiresIn: TOKEN_TTL_MS });
}

export async function requireAdminToken(request, env) {
  const token = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") || "";
  if (!token) return { ok: false, response: json({ success: false, msg: "未授权" }, 403) };
  if (await verifyAdminToken(env, token)) return { ok: true };
  return { ok: false, response: json({ success: false, msg: "登录已过期，请重新登录" }, 403) };
}

export function success(catalog, extra = {}) {
  return json({ success: true, catalog, ...extra });
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

async function createAdminToken(env) {
  const expiresAt = Date.now() + TOKEN_TTL_MS;
  const nonce = crypto.getRandomValues(new Uint8Array(18));
  const payload = `${expiresAt}.${base64Url(nonce)}`;
  return `${payload}.${await signToken(env, payload)}`;
}

async function verifyAdminToken(env, token) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) return false;
  const [expiresAtText, nonce, signature] = parts;
  const expiresAt = Number(expiresAtText);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;
  const expected = await signToken(env, `${expiresAtText}.${nonce}`);
  return timingSafeEqual(signature, expected);
}

async function signToken(env, payload) {
  const secret = env.ADMIN_TOKEN_SECRET || env.ADMIN_PASSWORD;
  if (!secret) return "";
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return base64Url(new Uint8Array(signature));
}

function timingSafeEqual(a, b) {
  const left = String(a || "");
  const right = String(b || "");
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return diff === 0;
}

function base64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
