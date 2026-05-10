import { json } from "../_lib/releases.js";
import { loadCatalog, publicCatalog } from "../_lib/catalog.js";
import { listArticles } from "../_lib/articles-db.js";

export async function onRequestGet({ env }) {
  const catalog = publicCatalog(await loadCatalog(env));
  const articles = await listArticles(env, { publicOnly: true });
  return json(articles ? { ...catalog, articles } : catalog);
}
