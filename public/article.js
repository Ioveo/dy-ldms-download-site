loadArticle();

async function loadArticle() {
  const slug = new URLSearchParams(location.search).get("slug");
  const root = document.getElementById("articleDetail");
  if (!slug) {
    root.innerHTML = "<section class='page-hero'><h1>文章不存在。</h1></section>";
    return;
  }
  const response = await fetch(`/api/article/${encodeURIComponent(slug)}`, { cache: "no-store" });
  if (!response.ok) {
    root.innerHTML = "<section class='page-hero'><h1>文章不存在。</h1></section>";
    return;
  }
  const data = await response.json();
  renderNavigation(data.navigation || []);
  document.title = `${data.article.title} - 天才猫软件中心`;
  renderArticle(data.article, data.relatedSoftware || []);
}

function renderArticle(article, software) {
  const root = document.getElementById("articleDetail");
  root.innerHTML = `<section class="article-cover article-cover--pro">${article.coverUrl ? `<img src="${escapeAttr(article.coverUrl)}" alt="">` : ""}<div><p class="eyebrow">Article</p><h1>${escapeHtml(article.title)}</h1><p>${escapeHtml(article.summary || "")}</p><div class="article-meta"><span>${formatDate(article.publishedAt || article.createdAt)}</span><span>${countWords(article.content)} 字阅读</span></div></div></section><section class="article-body article-body--pro"><article>${renderContent(article.content)}</article>${renderRelated(software)}</section>`;
}

function renderRelated(software) {
  if (!software.length) return "";
  return `<aside class="article-related"><p class="eyebrow">Related</p><h2>相关软件</h2>${software.map(item => `<a href="/download.html"><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.description || "查看下载")}</span></a>`).join("")}</aside>`;
}

function renderContent(content) {
  const value = String(content || "").trim();
  if (!value) return "<p>暂无正文。</p>";
  if (/<[a-z][\s\S]*>/i.test(value)) return value;
  return value.split(/\n{2,}/).map(part => `<p>${escapeHtml(part).replace(/\n/g, "<br>")}</p>`).join("");
}

function formatDate(timestamp) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function countWords(content) {
  const text = String(content || "").replace(/<[^>]+>/g, " ").trim();
  return text ? text.length : 0;
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

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[char]);
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}
