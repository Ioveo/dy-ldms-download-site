import { json } from "../_lib/releases.js";
import { loadCatalog, publicCatalog } from "../_lib/catalog.js";
import { listArticles } from "../_lib/articles-db.js";
import { applyDownloadStats } from "../_lib/download-stats.js";

export async function onRequestGet({ env }) {
  const catalog = publicCatalog(await applyDownloadStats(env, await loadCatalog(env)));
  const articles = await listArticles(env, { publicOnly: true });
  return json(articles ? { ...catalog, articles } : catalog);
}
