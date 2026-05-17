import { SECURITY_HEADERS, text } from "../../_lib/releases.js";

const NETEASE_AUDIO_ENDPOINT = "https://music.163.com/song/media/outer/url";

export async function onRequest({ request }) {
  if (request.method !== "GET" && request.method !== "HEAD") return text("Method Not Allowed", 405);

  const url = new URL(request.url);
  const id = String(url.searchParams.get("id") || "").trim();
  if (!/^\d{1,20}$/.test(id)) return text("Invalid music id", 400);

  const upstreamUrl = `${NETEASE_AUDIO_ENDPOINT}?id=${encodeURIComponent(id)}.mp3`;
  const headers = new Headers({
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
    "Referer": `https://music.163.com/song?id=${encodeURIComponent(id)}`,
    "Accept": "audio/*,*/*;q=0.8"
  });
  const range = request.headers.get("Range");
  if (range) headers.set("Range", range);

  const upstream = await fetch(upstreamUrl, {
    method: request.method,
    headers,
    redirect: "follow"
  });

  const contentType = upstream.headers.get("Content-Type") || "";
  const contentLength = upstream.headers.get("Content-Length") || "";
  if (!upstream.ok || contentType.includes("text/html") || contentLength === "0") {
    return text("Netease music is unavailable. Upload an audio file to R2 for stable playback.", 502);
  }

  const responseHeaders = new Headers(SECURITY_HEADERS);
  responseHeaders.set("Content-Type", contentType || "audio/mpeg");
  responseHeaders.set("Accept-Ranges", upstream.headers.get("Accept-Ranges") || "bytes");
  responseHeaders.set("Cache-Control", "public, max-age=300");
  for (const name of ["Content-Length", "Content-Range", "ETag", "Last-Modified"]) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }

  return new Response(request.method === "HEAD" ? null : upstream.body, {
    status: upstream.status,
    headers: responseHeaders
  });
}
