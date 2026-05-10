let activeCategory = "all";
let currentCatalog = null;

loadCatalog();
initShowcase();

async function loadCatalog() {
  if (!byId("softwareGrid")) return;
  try {
    const response = await fetch("/api/catalog", { cache: "no-store" });
    if (!response.ok) throw new Error("catalog request failed");
    const catalog = await response.json();
    document.title = `${catalog.product || "天才猫软件中心"} - 官方下载`;
    currentCatalog = catalog;
    renderNavigation(catalog);
    renderCategoryTabs(catalog);
    renderSoftwareGrid(catalog);
  } catch {
    const response = await fetch("/api/releases", { cache: "no-store" });
    const manifest = response.ok ? await response.json() : { releases: [] };
    renderNavigation({ navigation: defaultNavigation() });
    renderLegacyGrid(manifest);
  }
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
  for (const item of catalog.navigation.filter(entry => entry.status !== "disabled")) {
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

function renderSoftwareGrid(catalog) {
  const grid = byId("softwareGrid");
  const software = (catalog.software || []).filter(item => activeCategory === "all" || item.categoryId === activeCategory);
  grid.replaceChildren();

  if (!software.length) {
    const empty = document.createElement("article");
    empty.className = "product-card";
    empty.innerHTML = "<h3>暂无软件</h3><p>当前分类还没有上架软件。</p>";
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
      panel.innerHTML = `<span>${escapeHtml(category?.name || "SOFTWARE")}</span><strong>${escapeHtml(item.name)}</strong><p>${escapeHtml(item.slug || "download")}</p>`;
      media.append(panel);
    }

    const badge = document.createElement("span");
    badge.className = "product-card__badge";
    badge.textContent = category?.name || "软件";

    const title = document.createElement("h3");
    title.textContent = item.name;

    const desc = document.createElement("p");
    desc.textContent = item.description || latest?.description || "软件包已上架，可下载最新版。";

    const list = document.createElement("ul");
    const changelog = String(latest?.changelog || "").split("\n").filter(Boolean).slice(0, 4);
    for (const note of changelog.length ? changelog : ["后台上传版本自动展示", "R2 稳定存储安装包", "支持后续版本更新"]) {
      const li = document.createElement("li");
      li.textContent = note;
      list.append(li);
    }

    const meta = document.createElement("small");
    meta.textContent = latest ? [latest.version, latest.size, formatDate(latest.createdAt)].filter(Boolean).join(" · ") : "安装包待上传";

    const footer = document.createElement("div");
    footer.className = "product-card__footer";

    const link = document.createElement("a");
    link.className = latest ? "button button--primary" : "button button--disabled";
    link.href = latest ? `/download/${encodeURIComponent(latest.id)}` : "#download";
    link.textContent = latest ? "点击下载" : "待发布";
    footer.append(meta, link);

    card.append(media, badge, title, desc, list, footer);
    grid.append(card);
  }
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

function defaultNavigation() {
  return [
    { label: "首页", href: "/" },
    { label: "下载", href: "/download.html" },
    { label: "授权", href: "/license.html" },
    { label: "购买授权", href: "https://mk.nsy.me/buy", external: true }
  ];
}
