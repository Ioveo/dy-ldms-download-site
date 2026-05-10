import { loadCatalog, publicCatalog } from "../../_lib/catalog.js";
import { getArticleBySlug } from "../../_lib/articles-db.js";
import { json, text } from "../../_lib/releases.js";

export async function onRequestGet({ env, params }) {
  const catalog = publicCatalog(await loadCatalog(env));
  const dbArticle = await getArticleBySlug(env, params.slug);
  const article = dbArticle?.status === "published"
    ? dbArticle
    : catalog.articles.find(item => item.slug === params.slug || item.id === params.slug);
  if (!article) return text("Article not found", 404);
  const relatedSoftware = (article.softwareIds || [])
    .map(id => catalog.software.find(item => item.id === id))
    .filter(Boolean);
  return json({ article, relatedSoftware, navigation: catalog.navigation, product: catalog.product });
}
