export const DEFAULT_MANIFEST = {
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

export const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()"
};

export async function loadManifest(env) {
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

export function findLatestRelease(manifest) {
  const releases = Array.isArray(manifest.releases) ? manifest.releases : [];
  return releases.find(item => item.id === manifest.latest) || releases[0] || DEFAULT_MANIFEST.releases[0];
}

export async function serveRelease(env, release) {
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

export function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      ...SECURITY_HEADERS,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

export function text(body, status = 200) {
  return new Response(body, {
    status,
    headers: {
      ...SECURITY_HEADERS,
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function sanitizeFileName(value) {
  return String(value || "download.bin").replace(/["\\\r\n]/g, "");
}

function contentDisposition(fileName) {
  const safeName = sanitizeFileName(fileName);
  const asciiName = safeName.replace(/[^\x20-\x7E]/g, "_");
  return `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeRFC5987ValueChars(safeName)}`;
}

function encodeRFC5987ValueChars(value) {
  return encodeURIComponent(value).replace(/['()*]/g, char => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}
