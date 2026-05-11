import { loadCatalog } from "../../_lib/catalog.js";
import { hasDb, listArticles } from "../../_lib/articles-db.js";
import { ensureDownloadStatsTable } from "../../_lib/download-stats.js";
import { json } from "../../_lib/releases.js";
import { requireAdmin } from "./_lib.js";

export async function onRequestPost({ request, env }) {
  const auth = await requireAdmin(request, env);
  if (!auth.ok) return auth.response;

  const checks = [];
  const startedAt = Date.now();
  const bucketReady = Boolean(env.SOFTWARE_BUCKET?.get && env.SOFTWARE_BUCKET?.put);
  const dbReady = hasDb(env);
  let catalog = null;
  let articles = null;

  checks.push({ name: "ADMIN_PASSWORD", ok: Boolean(env.ADMIN_PASSWORD), detail: env.ADMIN_PASSWORD ? "已配置" : "未配置" });
  checks.push({ name: "STORAGE_SECRET", ok: Boolean(env.STORAGE_SECRET), detail: env.STORAGE_SECRET ? "已配置" : "未配置，不能保存外部存储授权" });
  checks.push({ name: "SOFTWARE_BUCKET", ok: bucketReady, detail: bucketReady ? "R2 绑定可用" : "R2 绑定缺失" });
  checks.push({ name: "DB", ok: dbReady, detail: dbReady ? "D1 已绑定" : "未绑定，文章会回退到 R2 catalog" });

  try {
    catalog = await loadCatalog(env);
    checks.push({ name: "catalog", ok: true, detail: `软件 ${catalog.software.length} 个，分类 ${catalog.categories.length} 个` });
  } catch (error) {
    checks.push({ name: "catalog", ok: false, detail: error?.message || "读取失败" });
  }

  try {
    articles = await listArticles(env, { publicOnly: false });
    checks.push({ name: "articles", ok: true, detail: articles ? `D1 文章 ${articles.length} 篇` : `R2 文章 ${catalog?.articles?.length || 0} 篇` });
  } catch (error) {
    checks.push({ name: "articles", ok: false, detail: error?.message || "读取失败" });
  }

  try {
    const statsReady = await ensureDownloadStatsTable(env);
    checks.push({ name: "download stats", ok: statsReady, detail: statsReady ? "D1 下载统计表可用" : "未绑定 D1，下载次数不会写回 catalog" });
  } catch (error) {
    checks.push({ name: "download stats", ok: false, detail: error?.message || "统计表检查失败" });
  }

  if (bucketReady) {
    const key = `health/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.txt`;
    try {
      await env.SOFTWARE_BUCKET.put(key, "ok", { httpMetadata: { contentType: "text/plain; charset=utf-8" } });
      const object = await env.SOFTWARE_BUCKET.get(key);
      if (env.SOFTWARE_BUCKET.delete) await env.SOFTWARE_BUCKET.delete(key);
      checks.push({ name: "R2 write/read", ok: Boolean(object), detail: object ? "写入和读取正常" : "写入后读取失败" });
    } catch (error) {
      checks.push({ name: "R2 write/read", ok: false, detail: error?.message || "写入测试失败" });
    }
  }

  return json({
    success: true,
    health: {
      mode: "pages-functions",
      checkedAt: Date.now(),
      elapsedMs: Date.now() - startedAt,
      product: catalog?.product || "天才猫软件中心",
      softwareCount: catalog?.software?.length || 0,
      articleCount: articles?.length ?? catalog?.articles?.length ?? 0,
      updatedAt: catalog?.updatedAt || 0,
      checks
    }
  });
}
