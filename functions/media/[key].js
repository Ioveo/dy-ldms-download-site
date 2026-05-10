import { SECURITY_HEADERS, text } from "../_lib/releases.js";

export async function onRequestGet({ env, params }) {
  if (!env.SOFTWARE_BUCKET?.get) return text("R2 binding SOFTWARE_BUCKET is not configured", 500);
  const key = decodeURIComponent(params.key || "");
  const object = await env.SOFTWARE_BUCKET.get(key);
  if (!object) return text("Media not found", 404);
  const headers = new Headers(SECURITY_HEADERS);
  object.writeHttpMetadata(headers);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  return new Response(object.body, { headers });
}
