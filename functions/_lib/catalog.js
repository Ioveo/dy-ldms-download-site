import { DEFAULT_MANIFEST } from "./releases.js";

export const CATALOG_KEY = "software/catalog.json";

export const DEFAULT_CATEGORIES = [
  { id: "data", name: "数据中心", slug: "data", sortOrder: 10, status: "active" },
  { id: "assistant", name: "直播辅助", slug: "assistant", sortOrder: 20, status: "active" },
  { id: "tools", name: "工具插件", slug: "tools", sortOrder: 30, status: "active" }
];

export async function loadCatalog(env) {
  const fallback = manifestToCatalog(DEFAULT_MANIFEST);
  if (!env.SOFTWARE_BUCKET?.get) return fallback;

  const object = await env.SOFTWARE_BUCKET.get(env.CATALOG_KEY || CATALOG_KEY);
  if (!object) return fallback;

  try {
    return normalizeCatalog(JSON.parse(stripBom(await object.text())));
  } catch {
    return fallback;
  }
}

export async function saveCatalog(env, catalog) {
  if (!env.SOFTWARE_BUCKET?.put) throw new Error("R2 binding SOFTWARE_BUCKET is not configured");
  const normalized = normalizeCatalog(catalog);
  normalized.updatedAt = Date.now();
  await env.SOFTWARE_BUCKET.put(env.CATALOG_KEY || CATALOG_KEY, JSON.stringify(normalized, null, 2), {
    httpMetadata: { contentType: "application/json; charset=utf-8" }
  });
  return normalized;
}

export function manifestToCatalog(manifest) {
  const releases = Array.isArray(manifest.releases) ? manifest.releases : [];
  const software = releases.map((release, index) => {
    const isAssistant = /assistant|辅助|live/i.test([release.id, release.name, release.category].filter(Boolean).join(" "));
    const slug = isAssistant ? "dy-assistant" : "datacenter";
    return {
      id: slug,
      categoryId: isAssistant ? "assistant" : "data",
      name: isAssistant ? "天才猫DY辅助工具" : "数据中心版",
      slug,
      description: release.description || "",
      coverUrl: isAssistant ? "" : "/datacenter-preview.jpg",
      sortOrder: index + 1,
      status: "active",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      releases: [normalizeRelease(release, slug)]
    };
  });

  return normalizeCatalog({
    product: manifest.product || "天才猫软件中心",
    categories: DEFAULT_CATEGORIES,
    software,
    updatedAt: Date.now()
  });
}

export function normalizeCatalog(catalog) {
  const now = Date.now();
  const categories = Array.isArray(catalog?.categories) && catalog.categories.length ? catalog.categories : DEFAULT_CATEGORIES;
  const software = Array.isArray(catalog?.software) ? catalog.software : [];

  return {
    product: catalog?.product || "天才猫软件中心",
    categories: categories.map((category, index) => ({
      id: String(category.id || category.slug || `category-${index + 1}`),
      name: String(category.name || "未命名分类"),
      slug: slugify(category.slug || category.name || `category-${index + 1}`),
      sortOrder: Number(category.sortOrder ?? category.sort_order ?? index),
      status: category.status || "active"
    })).sort(bySortOrder),
    software: software.map((item, index) => normalizeSoftware(item, index, now)).sort(bySortOrder),
    updatedAt: Number(catalog?.updatedAt || now)
  };
}

export function normalizeSoftware(item, index = 0, now = Date.now()) {
  const slug = slugify(item.slug || item.name || `software-${index + 1}`);
  const releases = Array.isArray(item.releases) ? item.releases : [];
  return {
    id: String(item.id || slug),
    categoryId: String(item.categoryId || item.category_id || "tools"),
    name: String(item.name || "未命名软件"),
    slug,
    description: String(item.description || ""),
    coverUrl: String(item.coverUrl || item.cover_url || ""),
    sortOrder: Number(item.sortOrder ?? item.sort_order ?? index),
    status: item.status || "active",
    createdAt: Number(item.createdAt || now),
    updatedAt: Number(item.updatedAt || now),
    releases: releases.map(release => normalizeRelease(release, slug)).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
  };
}

export function normalizeRelease(release, softwareSlug) {
  const id = String(release.id || `${softwareSlug}-${release.version || Date.now()}`).replace(/[^a-zA-Z0-9._-]/g, "-");
  return {
    id,
    version: String(release.version || "待上传"),
    title: String(release.title || release.name || ""),
    description: String(release.description || ""),
    changelog: Array.isArray(release.notes) ? release.notes.join("\n") : String(release.changelog || ""),
    fileKey: String(release.fileKey || release.key || ""),
    fileName: String(release.fileName || release.file_name || release.key?.split("/").pop() || ""),
    fileSize: Number(release.fileSize || release.file_size || 0),
    size: String(release.size || formatBytes(Number(release.fileSize || release.file_size || 0))),
    sha256: String(release.sha256 || ""),
    isLatest: release.isLatest !== false,
    status: release.status || "published",
    downloadCount: Number(release.downloadCount || release.download_count || 0),
    createdAt: Number(release.createdAt || parseDate(release.date) || Date.now()),
    updatedAt: Number(release.updatedAt || Date.now())
  };
}

export function findRelease(catalog, releaseId) {
  for (const item of catalog.software || []) {
    const release = item.releases?.find(entry => entry.id === releaseId);
    if (release) return { software: item, release };
  }
  return null;
}

export function findLatestRelease(catalog, softwareSlug) {
  const item = catalog.software?.find(entry => entry.slug === softwareSlug || entry.id === softwareSlug);
  if (!item) return null;
  const releases = (item.releases || []).filter(release => release.status !== "disabled");
  return { software: item, release: releases.find(release => release.isLatest) || releases[0] || null };
}

export function publicCatalog(catalog) {
  return {
    product: catalog.product,
    categories: catalog.categories.filter(item => item.status !== "disabled"),
    software: catalog.software
      .filter(item => item.status !== "disabled")
      .map(item => ({
        ...item,
        releases: (item.releases || []).filter(release => release.status !== "disabled")
      })),
    updatedAt: catalog.updatedAt
  };
}

export function slugify(value) {
  const text = String(value || "").trim().toLowerCase();
  const slug = text.replace(/[^a-z0-9\u4e00-\u9fa5]+/gi, "-").replace(/^-+|-+$/g, "");
  return slug || `item-${Date.now().toString(36)}`;
}

export function id(prefix = "id") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function formatBytes(bytes) {
  if (!bytes) return "";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function stripBom(value) {
  return String(value || "").replace(/^\uFEFF/, "");
}

function bySortOrder(a, b) {
  return (a.sortOrder || 0) - (b.sortOrder || 0);
}

function parseDate(value) {
  const time = Date.parse(value || "");
  return Number.isNaN(time) ? 0 : time;
}
