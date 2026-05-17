let allArticles = [];
let articleSearch = "";
let articleCategory = "all";
let articleTag = "all";

loadArticles();
initArticleFilters();

async function loadArticles() {
  const response = await fetch("/api/catalog", { cache: "no-store" });
  const catalog = response.ok ? await response.json() : { articles: [], navigation: [] };
  allArticles = catalog.articles || [];
  renderNavigation(catalog.navigation || []);
  renderFilterOptions(allArticles);
  renderArticles();
}

function renderArticles() {
  const grid = document.getElementById("articleGrid");
  const meta = document.getElementById("articleListMeta");
  const published = filteredArticles();
  const total = allArticles.filter(item => item.status === "published").length;
  if (meta) meta.textContent = published.length ? `显示 ${published.length} 篇 / 共 ${total} 篇已发布内容` : "暂无匹配内容";
  grid.replaceChildren();
  if (!published.length) {
    grid.innerHTML = "<article class='article-card article-card--empty'><div><span>Article</span><h2>暂无文章</h2><p>没有匹配当前筛选条件的文章。</p></div></article>";
    return;
  }
  published.forEach((article, index) => {
    const card = document.createElement("article");
    card.className = index === 0 ? "article-card article-card--lead" : "article-card";
    const tags = (article.tags || []).slice(0, 3).map(tag => `<em>${escapeHtml(tag)}</em>`).join("");
    card.innerHTML = `${article.coverUrl ? `<img src="${escapeAttr(article.coverUrl)}" alt="" loading="lazy">` : ""}<div><span>${escapeHtml(article.category || formatDate(article.createdAt) || "Article")}</span><h2>${escapeHtml(article.title)}</h2><p>${escapeHtml(article.summary || "查看这篇软件介绍。")}</p>${tags ? `<div class="article-card__tags">${tags}</div>` : ""}<a class="button button--primary" href="/article.html?slug=${encodeURIComponent(article.slug)}">阅读全文</a></div>`;
    grid.append(card);
  });
}

function filteredArticles() {
  return allArticles
    .filter(item => item.status === "published")
    .filter(item => articleCategory === "all" || (item.category || "") === articleCategory)
    .filter(item => articleTag === "all" || (item.tags || []).includes(articleTag))
    .filter(item => {
      if (!articleSearch) return true;
      const haystack = [item.title, item.summary, item.category, ...(item.tags || [])].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(articleSearch.toLowerCase());
    })
    .sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)) || Number(b.publishedAt || b.createdAt || 0) - Number(a.publishedAt || a.createdAt || 0));
}

function renderFilterOptions(articles) {
  const categorySelect = document.getElementById("articleCategoryFilter");
  const tagSelect = document.getElementById("articleTagFilter");
  if (!categorySelect || !tagSelect) return;
  const published = articles.filter(item => item.status === "published");
  const categories = Array.from(new Set(published.map(item => item.category).filter(Boolean))).sort((a, b) => a.localeCompare(b, "zh-CN"));
  const tags = Array.from(new Set(published.flatMap(item => item.tags || []))).sort((a, b) => a.localeCompare(b, "zh-CN"));
  categorySelect.innerHTML = `<option value="all">全部分类</option>${categories.map(item => `<option value="${escapeAttr(item)}">${escapeHtml(item)}</option>`).join("")}`;
  tagSelect.innerHTML = `<option value="all">全部标签</option>${tags.map(item => `<option value="${escapeAttr(item)}">${escapeHtml(item)}</option>`).join("")}`;
}

function initArticleFilters() {
  const search = document.getElementById("articleSearch");
  const category = document.getElementById("articleCategoryFilter");
  const tag = document.getElementById("articleTagFilter");
  const clear = document.getElementById("clearArticleFilters");
  if (!search || !category || !tag || !clear) return;
  search.addEventListener("input", event => { articleSearch = event.target.value.trim(); renderArticles(); });
  category.addEventListener("change", event => { articleCategory = event.target.value; renderArticles(); });
  tag.addEventListener("change", event => { articleTag = event.target.value; renderArticles(); });
  clear.addEventListener("click", () => {
    articleSearch = "";
    articleCategory = "all";
    articleTag = "all";
    search.value = "";
    category.value = "all";
    tag.value = "all";
    renderArticles();
  });
}

function renderNavigation(items) {
  const nav = document.querySelector("[data-nav]");
  if (!nav || !items.length) return;
  nav.replaceChildren();
  for (const item of items.filter(entry => entry.status !== "disabled" && !isAdminHref(entry.href))) {
    const link = document.createElement("a");
    link.href = item.href;
    link.textContent = item.label;
    if (item.external) { link.target = "_blank"; link.rel = "noopener"; }
    nav.append(link);
  }
}

function isAdminHref(href) {
  return /^\/(lvtuang|admin\.html)(?:$|[?#])/.test(String(href || ""));
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
