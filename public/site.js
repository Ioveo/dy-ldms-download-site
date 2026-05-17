let activeCategory = "all";
let currentCatalog = null;
let softwareSearch = "";
let softwareSortMode = "updated";

loadCatalog();
initShowcase();
initDownloadControls();

async function loadCatalog() {
  if (!byId("softwareGrid") && !byId("homeArticleGrid")) return;
  try {
    const response = await fetch("/api/catalog", { cache: "no-store" });
    if (!response.ok) throw new Error("catalog request failed");
    const catalog = await response.json();
    document.title = `${catalog.product || "天才猫软件中心"} - 官方下载`;
    currentCatalog = catalog;
    renderNavigation(catalog);
    renderCategoryTabs(catalog);
    renderSoftwareGrid(catalog);
    renderDownloadRank(catalog);
    renderHomeArticles(catalog);
  } catch {
    const response = await fetch("/api/releases", { cache: "no-store" });
    const manifest = response.ok ? await response.json() : { releases: [] };
    renderNavigation({ navigation: defaultNavigation() });
    renderLegacyGrid(manifest);
  }
}

function renderHomeArticles(catalog) {
  const grid = byId("homeArticleGrid");
  if (!grid) return;
  const articles = (catalog.articles || [])
    .filter(item => item.status === "published")
    .sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)) || (Number(b.publishedAt || b.createdAt || 0) - Number(a.publishedAt || a.createdAt || 0)))
    .slice(0, 3);
  grid.replaceChildren();

  if (!articles.length) {
    const empty = document.createElement("article");
    empty.className = "home-article home-article--empty";
    empty.innerHTML = "<div><span>Article</span><h3>文章准备中</h3><p>后台发布文章后，会在这里展示精选内容。</p></div>";
    grid.append(empty);
    return;
  }

  articles.forEach((article, index) => {
    const card = document.createElement("article");
    card.className = index === 0 ? "home-article home-article--featured" : "home-article";
    card.innerHTML = `${article.coverUrl ? `<img src="${escapeAttr(article.coverUrl)}" alt="" loading="lazy">` : ""}<div><span>${formatDate(article.createdAt) || "Article"}</span><h3>${escapeHtml(article.title)}</h3><p>${escapeHtml(article.summary || "查看这篇软件介绍和使用说明。")}</p><a href="/article.html?slug=${encodeURIComponent(article.slug)}">阅读全文</a></div>`;
    grid.append(card);
  });
}

function renderCategoryTabs(catalog) {
  const tabs = byId("categoryTabs");
  if (!tabs) return;
  const allCount = catalog.software?.length || 0;
  const categories = [{ id: "all", name: "全部软件", count: allCount }, ...(catalog.categories || []).map(category => ({
    ...category,
    count: (catalog.software || []).filter(item => item.categoryId === category.id).length
  }))];
  tabs.replaceChildren();
  for (const category of categories) {
    const button = document.createElement("button");
    button.type = "button";
    button.innerHTML = `<span>${escapeHtml(category.name)}</span><strong>${category.count || 0}</strong>`;
    button.className = category.id === activeCategory ? "is-active" : "";
    button.addEventListener("click", () => {
      activeCategory = category.id;
      renderCategoryTabs(catalog);
      renderSoftwareGrid(catalog);
    });
    tabs.append(button);
  }
}

function renderNavigation(catalog) {
  const nav = document.querySelector("[data-nav]");
  if (!nav || !Array.isArray(catalog.navigation)) return;
  nav.replaceChildren();
  for (const item of catalog.navigation.filter(entry => entry.status !== "disabled" && !isAdminHref(entry.href))) {
    const link = document.createElement("a");
    link.href = item.href;
    link.textContent = item.label;
    if (item.external) {
      link.target = "_blank";
      link.rel = "noopener";
    }
    nav.append(link);
  }
}

function isAdminHref(href) {
  return /^\/(lvtuang|admin\.html)(?:$|[?#])/.test(String(href || ""));
}

function renderSoftwareGrid(catalog) {
  const grid = byId("softwareGrid");
  if (!grid) return;
  const software = sortedSoftware((catalog.software || []).filter(item => {
    const inCategory = activeCategory === "all" || item.categoryId === activeCategory;
    if (!inCategory) return false;
    if (!softwareSearch) return true;
    const latest = latestDownloadableRelease(item);
    const haystack = [item.name, item.slug, item.description, latest?.version, latest?.changelog].filter(Boolean).join(" ").toLowerCase();
    return haystack.includes(softwareSearch.toLowerCase());
  }));
  grid.replaceChildren();

  if (!software.length) {
    const empty = document.createElement("article");
    empty.className = "product-card";
    empty.innerHTML = `<h3>暂无软件</h3><p>${softwareSearch ? "没有匹配当前搜索条件的软件。" : "当前分类还没有上架软件。"}</p>`;
    grid.append(empty);
    return;
  }

  for (const item of software) {
    const latest = (item.releases || []).find(release => release.isLatest) || item.releases?.[0];
    const category = catalog.categories?.find(entry => entry.id === item.categoryId);
    const card = document.createElement("article");
    card.className = `product-card product-card--${item.slug || "software"}`;

    const media = document.createElement("div");
    media.className = item.coverUrl ? "product-card__media" : "product-card__media product-card__media--mock";
    if (item.coverUrl) {
      const image = document.createElement("img");
      image.src = item.coverUrl;
      image.alt = `${item.name}软件截图`;
      image.loading = "lazy";
      media.append(image);
    } else {
      const panel = document.createElement("div");
      panel.className = "assistant-panel";
      panel.innerHTML = `<span>${escapeHtml(category?.name || "SOFTWARE")}</span><strong>${escapeHtml(item.name)}</strong><p>${escapeHtml(item.slug || "download")}</p><i>✦</i>`;
      media.append(panel);
    }

    const badge = document.createElement("span");
    badge.className = "product-card__badge";
    badge.innerHTML = `<i>⬢</i>${escapeHtml(category?.name || "软件")}`;

    const title = document.createElement("h3");
    title.textContent = item.name;

    const desc = document.createElement("p");
    desc.textContent = item.description || latest?.description || "软件包已上架，可下载最新版。";

    const list = document.createElement("ul");
    const changelog = String(latest?.changelog || "").split("\n").filter(Boolean).slice(0, 4);
    for (const note of changelog.length ? changelog : ["后台上传版本自动展示", "R2 稳定存储安装包", "支持后续版本更新"]) {
      const li = document.createElement("li");
      li.innerHTML = `<span>✓</span>${escapeHtml(note)}`;
      list.append(li);
    }

    const meta = document.createElement("small");
    meta.innerHTML = latest ? `<b>${escapeHtml(latest.version || "最新版")}</b><span>${[latest.size, formatDate(latest.createdAt)].filter(Boolean).map(escapeHtml).join(" · ")}</span>` : "安装包待上传";

    const footer = document.createElement("div");
    footer.className = "product-card__footer";

    const link = document.createElement("a");
    link.className = latest ? "button button--primary" : "button button--disabled";
    link.href = latest ? `/download/${encodeURIComponent(latest.id)}` : "#download";
    link.innerHTML = latest ? `<span>点击下载</span><i>↓</i>` : "待发布";
    const detailLink = document.createElement("a");
    detailLink.className = "button button--ghost";
    detailLink.href = `/software.html?slug=${encodeURIComponent(item.slug || item.id)}`;
    detailLink.textContent = "查看详情";
    const helper = document.createElement("span");
    helper.className = "product-card__helper";
    helper.textContent = latest ? "官方发布包，点击后开始下载" : "上传版本后自动开放下载";
    footer.append(meta, link, detailLink, helper);

    const status = document.createElement("div");
    status.className = "product-card__status";
    status.innerHTML = `<span>官方版本</span><span>${latest ? "可下载" : "待发布"}</span>`;

    const content = document.createElement("div");
    content.className = "product-card__content";
    content.append(status, badge, title, desc, list, footer);

    const recommendations = relatedSoftware(catalog, item).slice(0, 3);
    if (recommendations.length) {
      const related = document.createElement("div");
      related.className = "product-card__related";
      related.innerHTML = `<span>相关推荐</span>${recommendations.map(entry => `<a href="/software.html?slug=${encodeURIComponent(entry.slug || entry.id)}">${escapeHtml(entry.name)}</a>`).join("")}`;
      content.append(related);
    }

    card.append(media, content);
    grid.append(card);
  }
}

function sortedSoftware(items) {
  return [...items].sort((a, b) => {
    const latestA = (a.releases || []).find(release => release.isLatest) || a.releases?.[0];
    const latestB = (b.releases || []).find(release => release.isLatest) || b.releases?.[0];
    if (softwareSortMode === "downloads") {
      return totalDownloads(b) - totalDownloads(a) || String(a.name).localeCompare(String(b.name), "zh-CN");
    }
    if (softwareSortMode === "name") {
      return String(a.name).localeCompare(String(b.name), "zh-CN");
    }
    return Number(latestB?.createdAt || b.updatedAt || 0) - Number(latestA?.createdAt || a.updatedAt || 0);
  });
}

function totalDownloads(item) {
  return (item.releases || []).reduce((sum, release) => sum + Number(release.downloadCount || 0), 0);
}

function initDownloadControls() {
  const search = byId("softwareSearch");
  const sort = byId("softwareSortMode");
  const clear = byId("clearSoftwareSearch");
  if (!search || !sort || !clear) return;
  search.addEventListener("input", event => {
    softwareSearch = event.target.value.trim();
    if (currentCatalog) renderSoftwareGrid(currentCatalog);
  });
  sort.addEventListener("change", event => {
    softwareSortMode = event.target.value;
    if (currentCatalog) renderSoftwareGrid(currentCatalog);
  });
  clear.addEventListener("click", () => {
    softwareSearch = "";
    search.value = "";
    if (currentCatalog) renderSoftwareGrid(currentCatalog);
  });
}

function renderDownloadRank(catalog) {
  const root = byId("downloadRankList");
  if (!root) return;
  const ranked = (catalog.software || [])
    .map(item => ({
      ...item,
      latest: latestDownloadableRelease(item),
      downloads: (item.releases || []).reduce((sum, release) => sum + Number(release.downloadCount || 0), 0)
    }))
    .filter(item => item.status !== "disabled")
    .sort((a, b) => (b.downloads - a.downloads) || ((b.latest?.createdAt || 0) - (a.latest?.createdAt || 0)))
    .slice(0, 6);

  root.replaceChildren();
  if (!ranked.length) {
    root.innerHTML = `<p class="muted">暂无可下载软件。</p>`;
    return;
  }

  ranked.forEach((item, index) => {
    const category = catalog.categories?.find(entry => entry.id === item.categoryId);
    const link = document.createElement("a");
    link.className = "download-rank-item";
    link.href = item.latest ? `/download/${encodeURIComponent(item.latest.id)}` : "/download.html";
    link.innerHTML = `<b>${String(index + 1).padStart(2, "0")}</b><span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(category?.name || "软件")} · ${escapeHtml(item.latest?.version || "待发布")}</small></span><em>${item.latest ? "下载" : "待发布"}</em>`;
    root.append(link);
  });
}

function relatedSoftware(catalog, item) {
  return (catalog.software || []).filter(entry => entry.id !== item.id && entry.status !== "disabled" && entry.categoryId === item.categoryId);
}

function latestDownloadableRelease(item) {
  const releases = (item.releases || []).filter(isDownloadableRelease);
  return releases.find(release => release.isLatest) || releases[0] || null;
}

function isDownloadableRelease(release) {
  if (!release || release.status !== "published") return false;
  if (!release.fileKey && !release.publicUrl) return false;
  if (release.version === "待上传") return false;
  return Number(release.fileSize || 0) > 0 || Boolean(release.assetId || release.publicUrl);
}

function renderLegacyGrid(manifest) {
  currentCatalog = null;
  const catalog = {
    categories: [
      { id: "data", name: "数据管理" },
      { id: "assistant", name: "直播辅助" }
    ],
    software: (manifest.releases || []).map(release => {
      const isAssistant = /assistant|辅助|live/i.test([release.id, release.name, release.category].filter(Boolean).join(" "));
      return {
        id: release.id,
        categoryId: isAssistant ? "assistant" : "data",
        name: isAssistant ? "天才猫DY辅助工具" : "数据中心版",
        slug: release.id,
        description: release.description,
        coverUrl: isAssistant ? "" : "/datacenter-preview.jpg",
        releases: [{ ...release, fileKey: release.key, isLatest: true, createdAt: Date.parse(release.date || "") || Date.now() }]
      };
    })
  };
  renderCategoryTabs(catalog);
  renderSoftwareGrid(catalog);
}

function initShowcase() {
  const slides = Array.from(document.querySelectorAll(".showcase__slide"));
  const dots = Array.from(document.querySelectorAll(".showcase__dots button"));
  if (!slides.length || !dots.length) return;

  let active = 0;
  let timer = window.setInterval(nextSlide, 4800);

  dots.forEach((dot, index) => {
    dot.addEventListener("click", () => {
      showSlide(index);
      window.clearInterval(timer);
      timer = window.setInterval(nextSlide, 4800);
    });
  });

  function nextSlide() {
    showSlide((active + 1) % slides.length);
  }

  function showSlide(index) {
    slides[active].classList.remove("is-active");
    dots[active].classList.remove("is-active");
    active = index;
    slides[active].classList.add("is-active");
    dots[active].classList.add("is-active");
  }
}

function byId(id) {
  return document.getElementById(id);
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

function defaultNavigation() {
  return [
    { label: "首页", href: "/" },
    { label: "下载", href: "/download.html" },
    { label: "文章", href: "/articles.html" },
    { label: "授权", href: "/license.html" },
    { label: "购买授权", href: "https://mk.nsy.me/buy", external: true }
  ];
}
