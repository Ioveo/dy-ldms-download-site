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
  document.title = `${data.article.seoTitle || data.article.title} - 天才猫软件中心`;
  setMetaDescription(data.article.seoDescription || data.article.summary || data.article.title);
  renderArticle(data.article, data.relatedSoftware || []);
}

function renderArticle(article, software) {
  const root = document.getElementById("articleDetail");
  const tags = (article.tags || []).map(tag => `<span>${escapeHtml(tag)}</span>`).join("");
  root.innerHTML = `<section class="article-cover article-cover--pro">${article.coverUrl ? `<img src="${escapeAttr(article.coverUrl)}" alt="">` : ""}<div><p class="eyebrow">${escapeHtml(article.category || "Article")}</p><h1>${escapeHtml(article.title)}</h1><p>${escapeHtml(article.summary || "")}</p><div class="article-meta"><span>${formatDate(article.publishedAt || article.createdAt)}</span><span>${countWords(article.content)} 字阅读</span>${tags}</div></div></section><section class="article-body article-body--pro"><article>${renderContent(article.content)}</article>${renderRelated(software)}</section>`;
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

function renderRelated(software) {
  if (!software.length) return "";
  return `<aside class="article-related article-related--download"><p class="eyebrow">Download</p><h2>相关软件</h2>${software.map(item => `<a class="related-download" href="/download/latest/${encodeURIComponent(item.slug || item.id)}"><span class="related-download__icon">↓</span><span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.description || "下载最新版安装包")}</small></span><em>点击下载</em></a>`).join("")}</aside>`;
}

function renderContent(content) {
  const value = String(content || "").trim();
  if (!value) return "<p>暂无正文。</p>";
  if (/<[a-z][\s\S]*>/i.test(value)) return value;
  return markdownToHtml(value);
}

function markdownToHtml(value) {
  const blocks = [];
  const lines = String(value || "").replace(/\r\n/g, "\n").split("\n");
  let paragraph = [];
  let list = [];
  let code = [];
  let inCode = false;
  const flushParagraph = () => {
    if (!paragraph.length) return;
    blocks.push(`<p>${inlineMarkdown(paragraph.join("\n")).replace(/\n/g, "<br>")}</p>`);
    paragraph = [];
  };
  const flushList = () => {
    if (!list.length) return;
    blocks.push(`<ul>${list.map(item => `<li>${inlineMarkdown(item)}</li>`).join("")}</ul>`);
    list = [];
  };
  for (const line of lines) {
    if (/^```/.test(line.trim())) {
      if (inCode) {
        blocks.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);
        code = [];
        inCode = false;
      } else {
        flushParagraph();
        flushList();
        inCode = true;
      }
      continue;
    }
    if (inCode) { code.push(line); continue; }
    if (!line.trim()) { flushParagraph(); flushList(); continue; }
    const heading = /^(#{2,3})\s+(.+)$/.exec(line);
    if (heading) {
      flushParagraph();
      flushList();
      const level = heading[1].length;
      blocks.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
      continue;
    }
    const quote = /^>\s+(.+)$/.exec(line);
    if (quote) { flushParagraph(); flushList(); blocks.push(`<blockquote>${inlineMarkdown(quote[1])}</blockquote>`); continue; }
    const bullet = /^[-*]\s+(.+)$/.exec(line);
    if (bullet) { flushParagraph(); list.push(bullet[1]); continue; }
    paragraph.push(line);
  }
  flushParagraph();
  flushList();
  if (inCode) blocks.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);
  return blocks.join("");
}

function inlineMarkdown(value) {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]+)\)/g, `<a href="$2" target="_blank" rel="noopener">$1</a>`);
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
