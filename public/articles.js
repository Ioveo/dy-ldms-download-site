loadArticles();

async function loadArticles() {
  const response = await fetch("/api/catalog", { cache: "no-store" });
  const catalog = response.ok ? await response.json() : { articles: [], navigation: [] };
  renderNavigation(catalog.navigation || []);
  renderArticles(catalog.articles || []);
}

function renderArticles(articles) {
  const grid = document.getElementById("articleGrid");
  const meta = document.getElementById("articleListMeta");
  const published = articles.filter(item => item.status === "published");
  if (meta) meta.textContent = published.length ? `共 ${published.length} 篇已发布内容` : "暂无已发布内容";
  grid.replaceChildren();
  if (!published.length) {
    grid.innerHTML = "<article class='article-card article-card--empty'><div><span>Article</span><h2>暂无文章</h2><p>后台发布文章后会显示在这里。</p></div></article>";
    return;
  }
  published.forEach((article, index) => {
    const card = document.createElement("article");
    card.className = index === 0 ? "article-card article-card--lead" : "article-card";
    card.innerHTML = `${article.coverUrl ? `<img src="${escapeAttr(article.coverUrl)}" alt="" loading="lazy">` : ""}<div><span>${formatDate(article.createdAt) || "Article"}</span><h2>${escapeHtml(article.title)}</h2><p>${escapeHtml(article.summary || "查看这篇软件介绍。")}</p><a class="button button--primary" href="/article.html?slug=${encodeURIComponent(article.slug)}">阅读全文</a></div>`;
    grid.append(card);
  });
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
