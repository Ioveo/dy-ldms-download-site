loadArticles();

async function loadArticles() {
  const response = await fetch("/api/catalog", { cache: "no-store" });
  const catalog = response.ok ? await response.json() : { articles: [], navigation: [] };
  renderNavigation(catalog.navigation || []);
  renderArticles(catalog.articles || []);
}

function renderArticles(articles) {
  const grid = document.getElementById("articleGrid");
  grid.replaceChildren();
  if (!articles.length) {
    grid.innerHTML = "<article class='article-card'><h2>暂无文章</h2><p>后台发布文章后会显示在这里。</p></article>";
    return;
  }
  for (const article of articles) {
    const card = document.createElement("article");
    card.className = "article-card";
    card.innerHTML = `${article.coverUrl ? `<img src="${escapeAttr(article.coverUrl)}" alt="">` : ""}<div><span>${formatDate(article.createdAt)}</span><h2>${escapeHtml(article.title)}</h2><p>${escapeHtml(article.summary || "查看这篇软件介绍。")}</p><a class="button button--primary" href="/article.html?slug=${encodeURIComponent(article.slug)}">阅读全文</a></div>`;
    grid.append(card);
  }
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
