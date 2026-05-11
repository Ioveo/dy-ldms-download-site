import { id, slugify } from "./catalog.js";

export function hasDb(env) {
  return Boolean(env.DB?.prepare);
}

export async function ensureArticleTables(env) {
  if (!hasDb(env)) return false;
  await env.DB.batch([
    env.DB.prepare("CREATE TABLE IF NOT EXISTS articles (id TEXT PRIMARY KEY, title TEXT NOT NULL, slug TEXT NOT NULL UNIQUE, summary TEXT NOT NULL DEFAULT '', cover_url TEXT NOT NULL DEFAULT '', content TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'draft', sort_order INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, published_at INTEGER)"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS article_software (article_id TEXT NOT NULL, software_id TEXT NOT NULL, PRIMARY KEY (article_id, software_id))"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_articles_status_published ON articles(status, published_at)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug)")
  ]);
  await addColumnIfMissing(env, "category", "TEXT NOT NULL DEFAULT ''");
  await addColumnIfMissing(env, "tags", "TEXT NOT NULL DEFAULT ''");
  await addColumnIfMissing(env, "seo_title", "TEXT NOT NULL DEFAULT ''");
  await addColumnIfMissing(env, "seo_description", "TEXT NOT NULL DEFAULT ''");
  await addColumnIfMissing(env, "featured", "INTEGER NOT NULL DEFAULT 0");
  return true;
}

export async function listArticles(env, { publicOnly = false, limit = 100 } = {}) {
  if (!hasDb(env)) return null;
  await ensureArticleTables(env);
  const query = publicOnly
    ? "SELECT * FROM articles WHERE status = 'published' ORDER BY COALESCE(published_at, created_at) DESC, sort_order ASC LIMIT ?"
    : "SELECT * FROM articles ORDER BY updated_at DESC, created_at DESC LIMIT ?";
  const result = await env.DB.prepare(query).bind(limit).all();
  const articles = (result.results || []).map(rowToArticle);
  await attachSoftwareIds(env, articles);
  return articles;
}

export async function getArticleBySlug(env, slug) {
  if (!hasDb(env)) return null;
  await ensureArticleTables(env);
  const row = await env.DB.prepare("SELECT * FROM articles WHERE slug = ? OR id = ? LIMIT 1").bind(slug, slug).first();
  if (!row) return null;
  const article = rowToArticle(row);
  await attachSoftwareIds(env, [article]);
  return article;
}

export async function saveArticle(env, input) {
  if (!hasDb(env)) return null;
  await ensureArticleTables(env);
  const now = Date.now();
  const existing = input.id ? await env.DB.prepare("SELECT * FROM articles WHERE id = ?").bind(input.id).first() : null;
  const article = {
    id: input.id || id("article"),
    title: String(input.title || ""),
    slug: slugify(input.slug || input.title || Date.now()),
    summary: String(input.summary || ""),
    coverUrl: String(input.coverUrl || ""),
    content: String(input.content || ""),
    category: String(input.category || ""),
    tags: normalizeTags(input.tags),
    seoTitle: String(input.seoTitle || input.seo_title || ""),
    seoDescription: String(input.seoDescription || input.seo_description || ""),
    featured: Boolean(input.featured),
    status: input.status || "draft",
    sortOrder: Number(input.sortOrder || 0),
    createdAt: existing?.created_at || now,
    updatedAt: now,
    publishedAt: input.status === "published" ? (existing?.published_at || now) : null,
    softwareIds: Array.isArray(input.softwareIds) ? input.softwareIds.map(String) : []
  };

  await env.DB.prepare("INSERT OR REPLACE INTO articles (id,title,slug,summary,cover_url,content,category,tags,seo_title,seo_description,featured,status,sort_order,created_at,updated_at,published_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
    .bind(article.id, article.title, article.slug, article.summary, article.coverUrl, article.content, article.category, article.tags.join(","), article.seoTitle, article.seoDescription, article.featured ? 1 : 0, article.status, article.sortOrder, article.createdAt, article.updatedAt, article.publishedAt)
    .run();
  await env.DB.prepare("DELETE FROM article_software WHERE article_id = ?").bind(article.id).run();
  if (article.softwareIds.length) {
    await env.DB.batch(article.softwareIds.map(softwareId => env.DB.prepare("INSERT OR IGNORE INTO article_software (article_id, software_id) VALUES (?, ?)").bind(article.id, softwareId)));
  }
  return article;
}

export async function deleteArticle(env, articleId) {
  if (!hasDb(env)) return false;
  await ensureArticleTables(env);
  await env.DB.batch([
    env.DB.prepare("DELETE FROM article_software WHERE article_id = ?").bind(articleId),
    env.DB.prepare("DELETE FROM articles WHERE id = ?").bind(articleId)
  ]);
  return true;
}

async function attachSoftwareIds(env, articles) {
  if (!articles.length) return;
  const ids = articles.map(article => article.id);
  const placeholders = ids.map(() => "?").join(",");
  const result = await env.DB.prepare(`SELECT article_id, software_id FROM article_software WHERE article_id IN (${placeholders})`).bind(...ids).all();
  const map = new Map(articles.map(article => [article.id, article]));
  for (const row of result.results || []) {
    const article = map.get(row.article_id);
    if (article) article.softwareIds.push(row.software_id);
  }
}

function rowToArticle(row) {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    summary: row.summary || "",
    coverUrl: row.cover_url || "",
    content: row.content || "",
    category: row.category || "",
    tags: normalizeTags(row.tags || ""),
    seoTitle: row.seo_title || "",
    seoDescription: row.seo_description || "",
    featured: Boolean(row.featured),
    status: row.status || "draft",
    sortOrder: Number(row.sort_order || 0),
    createdAt: Number(row.created_at || 0),
    updatedAt: Number(row.updated_at || 0),
    publishedAt: Number(row.published_at || 0) || null,
    softwareIds: []
  };
}

async function addColumnIfMissing(env, name, definition) {
  try {
    await env.DB.prepare(`ALTER TABLE articles ADD COLUMN ${name} ${definition}`).run();
  } catch (error) {
    if (!String(error?.message || error).includes("duplicate column")) throw error;
  }
}

function normalizeTags(value) {
  const source = Array.isArray(value) ? value : String(value || "").split(/[,，\n]/);
  return source.map(item => String(item).trim()).filter(Boolean);
}
