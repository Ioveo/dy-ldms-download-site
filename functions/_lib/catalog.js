import { DEFAULT_MANIFEST } from "./releases.js";

export const CATALOG_KEY = "software/catalog.json";

export const DEFAULT_CATEGORIES = [
  { id: "data", name: "数据中心", slug: "data", sortOrder: 10, status: "active" },
  { id: "assistant", name: "直播辅助", slug: "assistant", sortOrder: 20, status: "active" },
  { id: "tools", name: "工具插件", slug: "tools", sortOrder: 30, status: "active" }
];

export const DEFAULT_NAVIGATION = [
  { id: "home", label: "首页", href: "/", sortOrder: 10, status: "active", external: false },
  { id: "download", label: "下载", href: "/download.html", sortOrder: 20, status: "active", external: false },
  { id: "articles", label: "文章", href: "/articles.html", sortOrder: 30, status: "active", external: false },
  { id: "license", label: "授权", href: "/license.html", sortOrder: 40, status: "active", external: false },
  { id: "buy", label: "购买授权", href: "https://mk.nsy.me/buy", sortOrder: 50, status: "active", external: true }
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
  const software = Array.isArray(catalog?.software) && catalog.software.length
    ? catalog.software
    : manifestToCatalog(DEFAULT_MANIFEST).software;

  return {
    product: catalog?.product || "天才猫软件中心",
    categories: categories.map((category, index) => ({
      id: String(category.id || category.slug || `category-${index + 1}`),
      name: String(category.name || "未命名分类"),
      slug: slugify(category.slug || category.name || `category-${index + 1}`),
      sortOrder: Number(category.sortOrder ?? category.sort_order ?? index),
      status: category.status || "active"
    })).sort(bySortOrder),
    navigation: normalizeNavigation(catalog?.navigation || []),
    software: software.map((item, index) => normalizeSoftware(item, index, now)).sort(bySortOrder),
    articles: normalizeArticles(catalog?.articles || []),
    music: normalizeMusic(catalog?.music || catalog?.tracks || []),
    storageAccounts: normalizeStorageAccounts(catalog?.storageAccounts || catalog?.storage_accounts || []),
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
  const version = String(release.version || "待上传");
  const fileSize = Number(release.fileSize || release.file_size || 0);
  const isPlaceholder = version === "待上传" && fileSize <= 0 && !release.assetId && !release.asset_id;
  return {
    id,
    version,
    title: String(release.title || release.name || ""),
    description: String(release.description || ""),
    changelog: Array.isArray(release.notes) ? release.notes.join("\n") : String(release.changelog || ""),
    assetId: String(release.assetId || release.asset_id || ""),
    fileKey: String(release.fileKey || release.key || ""),
    storageId: String(release.storageId || release.storage_id || "default"),
    publicUrl: String(release.publicUrl || release.public_url || ""),
    fileName: String(release.fileName || release.file_name || release.key?.split("/").pop() || ""),
    fileSize,
    size: String(release.size || formatBytes(fileSize)),
    sha256: String(release.sha256 || ""),
    isLatest: release.isLatest !== false,
    status: release.status || (isPlaceholder ? "draft" : "published"),
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
  const releases = (item.releases || []).filter(isDownloadableRelease);
  return { software: item, release: releases.find(release => release.isLatest) || releases[0] || null };
}

export function isDownloadableRelease(release) {
  if (!release || release.status !== "published") return false;
  if (!release.fileKey && !release.publicUrl) return false;
  if (release.version === "待上传") return false;
  return Number(release.fileSize || 0) > 0 || Boolean(release.assetId || release.publicUrl);
}

export function publicCatalog(catalog) {
  return {
    product: catalog.product,
    categories: catalog.categories.filter(item => item.status !== "disabled"),
    navigation: (catalog.navigation || DEFAULT_NAVIGATION).filter(item => item.status !== "disabled"),
    software: catalog.software
      .filter(item => item.status !== "disabled")
      .map(item => ({
        ...item,
        releases: (item.releases || []).filter(release => release.status !== "disabled")
      })),
    articles: (catalog.articles || []).filter(item => item.status === "published"),
    music: (catalog.music || []).filter(item => item.status === "published"),
    storageAccounts: (catalog.storageAccounts || []).map(publicStorageAccount),
    updatedAt: catalog.updatedAt
  };
}

export function normalizeArticles(articles) {
  return Array.isArray(articles) ? articles.map((article, index) => ({
    id: String(article.id || `article-${index + 1}`),
    title: String(article.title || "未命名文章"),
    slug: slugify(article.slug || article.title || `article-${index + 1}`),
    summary: String(article.summary || ""),
    coverUrl: String(article.coverUrl || article.cover_url || ""),
    content: String(article.content || ""),
    category: String(article.category || ""),
    tags: Array.isArray(article.tags) ? article.tags.map(String) : String(article.tags || "").split(/[,，\n]/).map(item => item.trim()).filter(Boolean),
    seoTitle: String(article.seoTitle || article.seo_title || ""),
    seoDescription: String(article.seoDescription || article.seo_description || ""),
    featured: Boolean(article.featured),
    softwareIds: Array.isArray(article.softwareIds) ? article.softwareIds.map(String) : [],
    status: article.status || "draft",
    sortOrder: Number(article.sortOrder ?? article.sort_order ?? index),
    createdAt: Number(article.createdAt || Date.now()),
    updatedAt: Number(article.updatedAt || Date.now())
  })).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)) : [];
}

export function normalizeMusic(items) {
  return Array.isArray(items) ? items.map((track, index) => ({
    id: String(track.id || `music-${index + 1}`),
    title: String(track.title || track.name || "未命名音乐"),
    artist: String(track.artist || "未知歌手"),
    album: String(track.album || ""),
    neteaseId: String(track.neteaseId || track.netease_id || ""),
    audioUrl: String(track.audioUrl || track.audio_url || track.url || ""),
    coverUrl: String(track.coverUrl || track.cover_url || ""),
    lyric: String(track.lyric || ""),
    tags: Array.isArray(track.tags) ? track.tags.map(String) : String(track.tags || "").split(/[,，\n]/).map(item => item.trim()).filter(Boolean),
    status: track.status || "draft",
    featured: Boolean(track.featured),
    sortOrder: Number(track.sortOrder ?? track.sort_order ?? index),
    playCount: Number(track.playCount || track.play_count || 0),
    createdAt: Number(track.createdAt || Date.now()),
    updatedAt: Number(track.updatedAt || Date.now())
  })).sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)) || (a.sortOrder || 0) - (b.sortOrder || 0) || (b.updatedAt || 0) - (a.updatedAt || 0)) : [];
}

export function normalizeNavigation(items) {
  const source = Array.isArray(items) && items.length ? items : DEFAULT_NAVIGATION;
  const withMusic = source.some(item => item.id === "music" || item.href === "/music.html")
    ? source
    : [...source, { id: "music", label: "音乐", href: "/music.html", sortOrder: 35, status: "active", external: false }];
  return withMusic.map((item, index) => ({
    id: String(item.id || `nav-${index + 1}`),
    label: String(item.label || item.name || "导航"),
    href: String(item.href || "/"),
    sortOrder: Number(item.sortOrder ?? item.sort_order ?? index),
    status: item.status || "active",
    external: Boolean(item.external)
  })).sort(bySortOrder);
}

export function normalizeStorageAccounts(accounts) {
  return Array.isArray(accounts) ? accounts.map((account, index) => ({
    id: String(account.id || `storage-${index + 1}`),
    name: String(account.name || "未命名存储"),
    provider: String(account.provider || "cloudflare-r2"),
    accountId: String(account.accountId || account.account_id || ""),
    bucket: String(account.bucket || ""),
    region: String(account.region || "auto"),
    endpoint: String(account.endpoint || ""),
    accessKeyId: String(account.accessKeyId || account.access_key_id || ""),
    encryptedSecretAccessKey: String(account.encryptedSecretAccessKey || account.encrypted_secret_access_key || ""),
    publicBaseUrl: String(account.publicBaseUrl || account.public_base_url || ""),
    status: account.status || "active",
    sortOrder: Number(account.sortOrder ?? account.sort_order ?? index),
    createdAt: Number(account.createdAt || Date.now()),
    updatedAt: Number(account.updatedAt || Date.now())
  })).sort(bySortOrder) : [];
}

export function publicStorageAccount(account) {
  return {
    id: account.id,
    name: account.name,
    provider: account.provider,
    accountId: account.accountId,
    bucket: account.bucket,
    region: account.region,
    endpoint: account.endpoint,
    publicBaseUrl: account.publicBaseUrl,
    status: account.status,
    sortOrder: account.sortOrder,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
    hasSecret: Boolean(account.encryptedSecretAccessKey)
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
