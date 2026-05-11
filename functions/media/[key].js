import { SECURITY_HEADERS, text } from "../_lib/releases.js";

export async function onRequest({ request, env, params }) {
  if (request.method !== "GET" && request.method !== "HEAD") return text("Method Not Allowed", 405);
  if (!env.SOFTWARE_BUCKET?.get) return text("R2 binding SOFTWARE_BUCKET is not configured", 500);
  const key = decodeURIComponent(params.key || "");
  if (!isPublicMediaKey(key)) return text("Media not found", 404);
  const rangeHeader = request.headers.get("Range");
  const range = parseRange(rangeHeader);
  const object = await env.SOFTWARE_BUCKET.get(key, range ? { range } : undefined);
  if (!object) return text("Media not found", 404);
  const headers = new Headers(SECURITY_HEADERS);
  object.writeHttpMetadata(headers);
  headers.set("Accept-Ranges", "bytes");
  headers.set("Cache-Control", "public, max-age=31536000, immutable");

  if (range && object.range) {
    const offset = object.range.offset || 0;
    const length = object.range.length || object.size;
    const completeLength = object.range.completeLength || object.size;
    headers.set("Content-Length", String(length));
    headers.set("Content-Range", `bytes ${offset}-${offset + length - 1}/${completeLength}`);
    return new Response(request.method === "HEAD" ? null : object.body, { status: 206, headers });
  }

  headers.set("Content-Length", String(object.size));
  return new Response(request.method === "HEAD" ? null : object.body, { headers });
}

function isPublicMediaKey(key) {
  return key.startsWith("article-image-")
    || key.startsWith("article-audio-")
    || key.startsWith("media/images/")
    || key.startsWith("media/audio/")
    || key.startsWith("site/");
}

function parseRange(value) {
  const match = /^bytes=(\d+)-(\d*)$/.exec(value || "");
  if (!match) return null;
  const offset = Number(match[1]);
  const end = match[2] ? Number(match[2]) : undefined;
  if (!Number.isSafeInteger(offset) || offset < 0) return null;
  if (end !== undefined && (!Number.isSafeInteger(end) || end < offset)) return null;
  return end === undefined ? { offset } : { offset, length: end - offset + 1 };
}
