import { loadCatalog, publicCatalog } from "./_lib/catalog.js";
import { listArticles } from "./_lib/articles-db.js";

export async function onRequestGet({ request, env }) {
  const origin = new URL(request.url).origin;
  const catalog = publicCatalog(await loadCatalog(env));
  const dbArticles = await listArticles(env, { publicOnly: true });
  const articles = dbArticles || catalog.articles || [];
  const urls = [
    { loc: `${origin}/`, priority: "1.0" },
    { loc: `${origin}/download.html`, priority: "0.9" },
    { loc: `${origin}/articles.html`, priority: "0.8" },
    { loc: `${origin}/license.html`, priority: "0.7" },
    ...articles.map(article => ({
      loc: `${origin}/article.html?slug=${encodeURIComponent(article.slug)}`,
      lastmod: article.updatedAt ? new Date(article.updatedAt).toISOString() : "",
      priority: article.featured ? "0.8" : "0.6"
    }))
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(item => `  <url>\n    <loc>${escapeXml(item.loc)}</loc>${item.lastmod ? `\n    <lastmod>${item.lastmod}</lastmod>` : ""}\n    <priority>${item.priority}</priority>\n  </url>`).join("\n")}\n</urlset>`;
  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" }
  });
}

function escapeXml(value) {
  return String(value).replace(/[&<>"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" })[char]);
}
