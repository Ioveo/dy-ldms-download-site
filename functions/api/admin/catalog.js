import { loadCatalog, publicStorageAccount } from "../../_lib/catalog.js";
import { listArticles } from "../../_lib/articles-db.js";
import { json } from "../../_lib/releases.js";
import { requireAdmin } from "./_lib.js";

export async function onRequestPost({ request, env }) {
  const auth = await requireAdmin(request, env);
  if (!auth.ok) return auth.response;
  const catalog = await loadCatalog(env);
  const articles = await listArticles(env, { publicOnly: false });
  return json({
    success: true,
    catalog: {
      ...catalog,
      articles: articles || catalog.articles,
      storageAccounts: catalog.storageAccounts.map(publicStorageAccount)
    }
  });
}
