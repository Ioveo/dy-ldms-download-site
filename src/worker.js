const DEFAULT_MANIFEST = {
  product: "天才猫直播数据管理",
  latest: "datacenter-stable",
  releases: [
    {
      id: "datacenter-stable",
      channel: "stable",
      category: "数据管理",
      name: "数据中心独立版",
      description: "直播数据录入、复盘、报表和后台管理工具。",
      version: "待上传",
      date: "2026-05-09",
      key: "releases/DyDataCenter.App.zip",
      fileName: "DyDataCenter.App.zip",
      size: "",
      sha256: "",
      notes: ["上传安装包和 manifest.json 后，这里会自动显示正式版本。"]
    },
    {
      id: "live-assistant-stable",
      channel: "stable",
      category: "直播辅助",
      name: "直播辅助工具",
      description: "自动讲解、快速回复、宏录制独立打包，授权系统保持原绑定逻辑。",
      version: "待上传",
      date: "2026-05-09",
      key: "releases/TianCaiMao.LiveAssistant.zip",
      fileName: "TianCaiMao.LiveAssistant.zip",
      size: "",
      sha256: "",
      notes: ["自动讲解、快速回复、宏录制已拆分为独立软件。"]
    }
  ]
};

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()"
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/releases") {
      return json(await loadManifest(env));
    }

    if (url.pathname === "/api/admin/article-image") {
      return uploadArticleMedia(request, env);
    }

    if (url.pathname.startsWith("/media/")) {
      return serveMedia(request, env, decodeURIComponent(url.pathname.slice("/media/".length)));
    }

    if (url.pathname === "/download/latest") {
      const manifest = await loadManifest(env);
      const release = findLatestRelease(manifest);
      return serveRelease(env, release);
    }

    if (url.pathname.startsWith("/download/")) {
      const releaseId = decodeURIComponent(url.pathname.slice("/download/".length));
      const manifest = await loadManifest(env);
      const release = manifest.releases?.find(item => item.id === releaseId);
      if (!release) {
        return text("Release not found", 404);
      }
      return serveRelease(env, release);
    }

    if (env.ASSETS?.fetch) {
      return env.ASSETS.fetch(request);
    }

    return text("Static assets binding is not configured", 500);
  }
};

async function uploadArticleMedia(request, env) {
  if (request.method !== "POST") return text("Method Not Allowed", 405);
  if (String(request.headers.get("Content-Type") || "").includes("application/json")) {
    return uploadArticleMediaJson(request, env);
  }

  let formData;
  try {
    formData = await request.formData();
  } catch (error) {
    return json({ success: false, msg: `读取上传文件失败：${error.message || "表单格式错误"}` }, 400);
  }

  const password = String(formData.get("password") || "");
  if (!env.ADMIN_PASSWORD || password !== env.ADMIN_PASSWORD) {
    return json({ success: false, msg: "密码错误或未配置 ADMIN_PASSWORD" }, 403);
  }
  if (!env.SOFTWARE_BUCKET?.put) return json({ success: false, msg: "R2 未配置或当前环境未绑定 SOFTWARE_BUCKET" }, 500);

  const file = formData.get("file");
  if (!file?.arrayBuffer) return json({ success: false, msg: "请选择媒体文件" }, 400);
  const kind = String(formData.get("kind") || "");
  const type = String(file.type || inferredContentType(file.name) || "");
  const mediaKind = type.startsWith("audio/") ? "audio" : type.startsWith("image/") ? "image" : "";
  if (!mediaKind) return json({ success: false, msg: "只能上传图片或音频文件" }, 400);
  if (kind === "image" && mediaKind !== "image") return json({ success: false, msg: "请选择图片文件" }, 400);
  if (kind === "audio" && mediaKind !== "audio") return json({ success: false, msg: "请选择音频文件" }, 400);

  const prefix = mediaKind === "audio" ? "article-audio" : "article-image";
  const key = `${prefix}-${crypto.randomUUID()}-${sanitizeMediaFileName(file.name || "article-media.bin")}`;
  try {
    await env.SOFTWARE_BUCKET.put(key, await file.arrayBuffer(), {
      httpMetadata: { contentType: type || "application/octet-stream" }
    });
  } catch (error) {
    return json({ success: false, msg: `上传到 R2 失败：${error.message || "未知错误"}` }, 500);
  }

  return json({ success: true, key, url: `/media/${encodeURIComponent(key)}` });
}

async function uploadArticleMediaJson(request, env) {
  let body;
  try {
    body = await request.json();
  } catch (error) {
    return json({ success: false, msg: `读取上传数据失败：${error.message || "JSON 格式错误"}` }, 400);
  }

  const password = String(body.password || "");
  if (!env.ADMIN_PASSWORD || password !== env.ADMIN_PASSWORD) {
    return json({ success: false, msg: "密码错误或未配置 ADMIN_PASSWORD" }, 403);
  }
  if (!env.SOFTWARE_BUCKET?.put) return json({ success: false, msg: "R2 未配置或当前环境未绑定 SOFTWARE_BUCKET" }, 500);

  const fileName = sanitizeMediaFileName(body.fileName || "article-media.bin");
  const type = String(body.contentType || inferredContentType(fileName) || "");
  const mediaKind = type.startsWith("audio/") ? "audio" : type.startsWith("image/") ? "image" : "";
  const kind = String(body.kind || "");
  if (!mediaKind) return json({ success: false, msg: "只能上传图片或音频文件" }, 400);
  if (kind === "image" && mediaKind !== "image") return json({ success: false, msg: "请选择图片文件" }, 400);
  if (kind === "audio" && mediaKind !== "audio") return json({ success: false, msg: "请选择音频文件" }, 400);
  if (!body.data) return json({ success: false, msg: "上传数据为空" }, 400);

  const prefix = mediaKind === "audio" ? "article-audio" : "article-image";
  const key = `${prefix}-${crypto.randomUUID()}-${fileName}`;
  try {
    await env.SOFTWARE_BUCKET.put(key, base64ToBytes(String(body.data || "")), {
      httpMetadata: { contentType: type || "application/octet-stream" }
    });
  } catch (error) {
    return json({ success: false, msg: `上传到 R2 失败：${error.message || "未知错误"}` }, 500);
  }

  return json({ success: true, key, url: `/media/${encodeURIComponent(key)}` });
}

function base64ToBytes(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

async function serveMedia(request, env, key) {
  if (request.method !== "GET" && request.method !== "HEAD") return text("Method Not Allowed", 405);
  if (!env.SOFTWARE_BUCKET?.get) return text("R2 binding SOFTWARE_BUCKET is not configured", 500);
  const range = parseRange(request.headers.get("Range"));
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

async function loadManifest(env) {
  if (!env.SOFTWARE_BUCKET?.get) {
    return DEFAULT_MANIFEST;
  }

  const key = env.MANIFEST_KEY || "releases/manifest.json";
  const object = await env.SOFTWARE_BUCKET.get(key);
  if (!object) {
    return DEFAULT_MANIFEST;
  }

  try {
    return JSON.parse(stripBom(await object.text()));
  } catch {
    return DEFAULT_MANIFEST;
  }
}

function stripBom(value) {
  return String(value || "").replace(/^\uFEFF/, "");
}

function findLatestRelease(manifest) {
  const releases = Array.isArray(manifest.releases) ? manifest.releases : [];
  return releases.find(item => item.id === manifest.latest) || releases[0] || DEFAULT_MANIFEST.releases[0];
}

async function serveRelease(env, release) {
  if (!env.SOFTWARE_BUCKET?.get) {
    return text("R2 binding SOFTWARE_BUCKET is not configured", 500);
  }

  if (!release?.key) {
    return text("Release is not configured", 404);
  }

  const object = await env.SOFTWARE_BUCKET.get(release.key);
  if (!object) {
    return text("File has not been uploaded to R2 yet", 404);
  }

  const headers = new Headers(SECURITY_HEADERS);
  object.writeHttpMetadata(headers);
  headers.set("Content-Type", headers.get("Content-Type") || "application/octet-stream");
  headers.set("Content-Length", object.size.toString());
  headers.set("ETag", object.httpEtag);
  headers.set("Cache-Control", "public, max-age=3600");
  headers.set("Content-Disposition", contentDisposition(release.fileName || release.key.split("/").pop()));

  return new Response(object.body, { headers });
}

function sanitizeFileName(value) {
  return String(value || "download.bin").replace(/["\\\r\n]/g, "");
}

function sanitizeMediaFileName(value) {
  return String(value || "article-media.bin").replace(/["\\\r\n]/g, "").replace(/[^a-zA-Z0-9._-]/g, "-");
}

function inferredContentType(name) {
  const ext = String(name || "").toLowerCase().split(".").pop();
  return {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    avif: "image/avif",
    svg: "image/svg+xml",
    mp3: "audio/mpeg",
    m4a: "audio/mp4",
    aac: "audio/aac",
    wav: "audio/wav",
    ogg: "audio/ogg",
    oga: "audio/ogg",
    webm: "audio/webm",
    flac: "audio/flac"
  }[ext] || "";
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

function contentDisposition(fileName) {
  const safeName = sanitizeFileName(fileName);
  const asciiName = safeName.replace(/[^\x20-\x7E]/g, "_");
  return `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeRFC5987ValueChars(safeName)}`;
}

function encodeRFC5987ValueChars(value) {
  return encodeURIComponent(value).replace(/['()*]/g, char => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      ...SECURITY_HEADERS,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function text(body, status = 200) {
  return new Response(body, {
    status,
    headers: {
      ...SECURITY_HEADERS,
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}
