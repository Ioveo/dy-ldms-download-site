loadSoftware();

async function loadSoftware() {
  const slug = new URLSearchParams(location.search).get("slug");
  const root = document.getElementById("softwareDetail");
  if (!slug) return renderMissing(root);

  const response = await fetch("/api/catalog", { cache: "no-store" });
  if (!response.ok) return renderMissing(root);
  const catalog = await response.json();
  renderNavigation(catalog.navigation || []);

  const software = (catalog.software || []).find(item => item.slug === slug || item.id === slug);
  if (!software) return renderMissing(root);
  const category = (catalog.categories || []).find(item => item.id === software.categoryId);
  const articles = (catalog.articles || []).filter(article => (article.softwareIds || []).includes(software.id));
  renderSoftware(root, software, category, articles);
}

function renderSoftware(root, software, category, articles) {
  const releases = (software.releases || []).filter(item => item.status !== "disabled");
  const latest = releases.find(item => item.isLatest) || releases[0];
  document.title = `${software.name} - 天才猫软件中心`;
  setMetaDescription(software.description || `${software.name} 官方下载、更新日志和使用教程。`);

  root.innerHTML = `
    <section class="software-hero">
      <div class="software-hero__copy">
        <p class="eyebrow">${escapeHtml(category?.name || "Software")}</p>
        <h1>${escapeHtml(software.name)}</h1>
        <p>${escapeHtml(software.description || latest?.description || "查看软件能力、版本更新和官方下载入口。")}</p>
        <div class="software-actions">
          ${latest ? `<a class="button button--primary" href="/download/${encodeURIComponent(latest.id)}">下载最新版 ${escapeHtml(latest.version || "")}</a>` : `<span class="button button--disabled">版本待发布</span>`}
          <a class="button button--ghost" href="/download.html">返回下载中心</a>
        </div>
        <div class="software-hero__meta">
          <span>分类：${escapeHtml(category?.name || "未分类")}</span>
          <span>版本：${escapeHtml(latest?.version || "待发布")}</span>
          <span>下载：${totalDownloads(releases)}</span>
        </div>
      </div>
      <div class="software-hero__media">
        ${software.coverUrl ? `<img src="${escapeAttr(software.coverUrl)}" alt="${escapeAttr(software.name)} 软件截图">` : `<div class="assistant-panel"><span>${escapeHtml(category?.name || "SOFTWARE")}</span><strong>${escapeHtml(software.name)}</strong><p>${escapeHtml(software.slug || software.id)}</p><i>✦</i></div>`}
      </div>
    </section>
    <section class="software-detail-grid">
      <article class="software-panel">
        <p class="eyebrow">Release Notes</p>
        <h2>更新日志</h2>
        ${renderReleaseTimeline(releases)}
      </article>
      <aside class="software-panel software-panel--side">
        <p class="eyebrow">Download</p>
        <h2>版本信息</h2>
        ${latest ? `<dl><dt>最新版</dt><dd>${escapeHtml(latest.version || "-")}</dd><dt>文件大小</dt><dd>${escapeHtml(latest.size || "-")}</dd><dt>发布时间</dt><dd>${formatDate(latest.createdAt) || "-"}</dd><dt>下载次数</dt><dd>${latest.downloadCount || 0}</dd></dl><a class="button button--primary" href="/download/${encodeURIComponent(latest.id)}">立即下载</a>` : `<p class="muted">当前软件还没有发布安装包。</p>`}
      </aside>
    </section>
    <section class="software-articles">
      <div class="section-head"><p class="eyebrow">Guides</p><h2>相关教程和说明</h2><p>阅读使用教程、功能介绍和更新说明，下载前先了解适用场景。</p></div>
      <div class="software-article-grid">${renderArticles(articles)}</div>
    </section>
  `;
}

function renderReleaseTimeline(releases) {
  if (!releases.length) return `<p class="muted">还没有发布版本。</p>`;
  return `<div class="release-timeline">${releases.map(release => `<article><span>${formatDate(release.createdAt) || "Release"}</span><h3>${escapeHtml(release.version || "版本")}${release.isLatest ? " · 最新" : ""}</h3>${renderChangelog(release.changelog)}<a href="/download/${encodeURIComponent(release.id)}">下载此版本</a></article>`).join("")}</div>`;
}

function renderChangelog(value) {
  const notes = String(value || "").split("\n").map(item => item.trim()).filter(Boolean).slice(0, 8);
  if (!notes.length) return `<p>暂无更新说明。</p>`;
  return `<ul>${notes.map(note => `<li>${escapeHtml(note)}</li>`).join("")}</ul>`;
}

function renderArticles(articles) {
  if (!articles.length) return `<article class="article-card article-card--empty"><div><span>Article</span><h2>暂无相关文章</h2><p>后台关联文章后会显示在这里。</p></div></article>`;
  return articles.slice(0, 6).map(article => `<article class="article-card">${article.coverUrl ? `<img src="${escapeAttr(article.coverUrl)}" alt="" loading="lazy">` : ""}<div><span>${escapeHtml(article.category || formatDate(article.createdAt) || "Article")}</span><h2>${escapeHtml(article.title)}</h2><p>${escapeHtml(article.summary || "查看这篇软件介绍。")}</p><a class="button button--primary" href="/article.html?slug=${encodeURIComponent(article.slug)}">阅读全文</a></div></article>`).join("");
}

function renderMissing(root) {
  document.title = "软件不存在 - 天才猫软件中心";
  root.innerHTML = `<section class="page-hero"><h1>软件不存在。</h1><p>请返回下载中心选择已上架的软件。</p><a class="button button--primary" href="/download.html">返回下载中心</a></section>`;
}

function totalDownloads(releases) {
  return releases.reduce((sum, release) => sum + Number(release.downloadCount || 0), 0);
}

function setMetaDescription(value) {
  let meta = document.querySelector("meta[name='description']");
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "description";
    document.head.append(meta);
  }
  meta.content = String(value || "").slice(0, 160);
}

function renderNavigation(items) {
  const nav = document.querySelector("[data-nav]");
  if (!nav || !items.length) return;
  nav.replaceChildren();
  for (const item of items.filter(entry => entry.status !== "disabled")) {
    const link = document.createElement("a");
    link.href = item.href;
    link.textContent = item.label;
    if (item.external) { link.target = "_blank"; link.rel = "noopener"; }
    nav.append(link);
  }
}

function formatDate(timestamp) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[char]);
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}
