export const DEFAULT_MANIFEST = {
  product: "天才猫直播数据管理",
  latest: "datacenter-stable",
  releases: [
    {
      id: "datacenter-stable",
      channel: "stable",
      name: "数据中心独立版",
      version: "待上传",
      date: "2026-05-09",
      key: "releases/DyDataCenter.App.zip",
      fileName: "DyDataCenter.App.zip",
      size: "",
      sha256: "",
      notes: ["上传安装包和 manifest.json 后，这里会自动显示正式版本。"]
    }
  ]
};

export const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()"
};

export async function loadManifest(env) {
  const key = env.MANIFEST_KEY || "releases/manifest.json";
  const object = await env.SOFTWARE_BUCKET.get(key);
  if (!object) {
    return DEFAULT_MANIFEST;
  }

  try {
    return JSON.parse(await object.text());
  } catch {
    return DEFAULT_MANIFEST;
  }
}

export function findLatestRelease(manifest) {
  const releases = Array.isArray(manifest.releases) ? manifest.releases : [];
  return releases.find(item => item.id === manifest.latest) || releases[0] || DEFAULT_MANIFEST.releases[0];
}

export async function serveRelease(env, release) {
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
  headers.set("Content-Disposition", `attachment; filename="${sanitizeFileName(release.fileName || release.key.split("/").pop())}"`);

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
