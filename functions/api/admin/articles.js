import { listArticles, saveArticle } from "../../_lib/articles-db.js";
import { id, loadCatalog, saveCatalog, slugify } from "../../_lib/catalog.js";
import { json } from "../../_lib/releases.js";
import { requireAdmin, success } from "./_lib.js";

export async function onRequestPost({ request, env }) {
  const auth = await requireAdmin(request, env);
  if (!auth.ok) return auth.response;
  const body = auth.body || {};
  if (!body.title) return json({ success: false, msg: "请填写文章标题" }, 400);

  let catalog = await loadCatalog(env);
  const savedToDb = await saveArticle(env, body);
  if (savedToDb) {
    catalog = await loadCatalog(env);
    return success({ ...catalog, articles: await listArticles(env, { publicOnly: false }) });
  }

  const now = Date.now();
  const article = {
    id: body.id || id("article"),
    title: String(body.title),
    slug: slugify(body.slug || body.title),
    summary: String(body.summary || ""),
    coverUrl: String(body.coverUrl || ""),
    content: String(body.content || ""),
    category: String(body.category || ""),
    tags: Array.isArray(body.tags) ? body.tags.map(String) : String(body.tags || "").split(/[,，\n]/).map(item => item.trim()).filter(Boolean),
    seoTitle: String(body.seoTitle || ""),
    seoDescription: String(body.seoDescription || ""),
    featured: Boolean(body.featured),
    softwareIds: Array.isArray(body.softwareIds) ? body.softwareIds.map(String) : [],
    status: body.status || "draft",
    sortOrder: Number(body.sortOrder || 0),
    createdAt: now,
    updatedAt: now
  };

  const index = catalog.articles.findIndex(item => item.id === article.id);
  if (index >= 0) {
    article.createdAt = catalog.articles[index].createdAt;
    catalog.articles[index] = article;
  } else {
    catalog.articles.push(article);
  }

  return success(await saveCatalog(env, catalog));
}
