let activeTag = "all";
let searchText = "";
let galleryItems = [];
let visibleItems = [];
let activeIndex = -1;

const masonry = byId("galleryMasonry");
const viewer = byId("galleryViewer");
const viewerImage = byId("galleryViewerImage");
const viewerTitle = byId("galleryViewerTitle");
const viewerDescription = byId("galleryViewerDescription");
const viewerOriginal = byId("galleryOriginal");
const figure = byId("galleryFigure");

loadGallery();

byId("galleryClose").addEventListener("click", closeViewer);
byId("galleryPrev").addEventListener("click", () => moveViewer(-1));
byId("galleryNext").addEventListener("click", () => moveViewer(1));
byId("galleryFullscreen").addEventListener("click", toggleOriginalView);
byId("gallerySearch").addEventListener("input", event => {
  searchText = event.target.value.trim().toLowerCase();
  renderGallery();
});

viewer.addEventListener("click", event => {
  if (event.target === viewer) closeViewer();
});

viewerImage.addEventListener("click", toggleOriginalView);

document.addEventListener("keydown", event => {
  if (viewer.hidden) return;
  if (event.key === "Escape") closeViewer();
  if (event.key === "ArrowLeft") moveViewer(-1);
  if (event.key === "ArrowRight") moveViewer(1);
  if (event.key === "Enter" || event.key.toLowerCase() === "f") toggleOriginalView();
});

async function loadGallery() {
  try {
    const response = await fetch("/api/catalog", { cache: "no-store" });
    if (!response.ok) throw new Error("catalog request failed");
    const catalog = await response.json();
    renderNavigation(catalog);
    galleryItems = (catalog.gallery || [])
      .filter(item => item.imageUrl)
      .map(item => ({
        ...item,
        thumbUrl: item.thumbUrl || item.imageUrl,
        tags: item.tags || []
      }));
    setHeroImage(galleryItems.find(item => item.featured) || galleryItems[0]);
    renderTags();
    renderGallery();
  } catch {
    masonry.innerHTML = `<p class="gallery-empty">画廊暂时不可用。</p>`;
  }
}

function renderGallery() {
  visibleItems = galleryItems.filter(item => {
    const inTag = activeTag === "all" || (item.tags || []).includes(activeTag);
    if (!inTag) return false;
    if (!searchText) return true;
    return [item.title, item.description, ...(item.tags || [])].join(" ").toLowerCase().includes(searchText);
  });

  byId("galleryCount").textContent = `${visibleItems.length} 张图片`;
  masonry.replaceChildren();
  if (!visibleItems.length) {
    masonry.innerHTML = `<p class="gallery-empty">没有匹配的图片。</p>`;
    return;
  }

  visibleItems.forEach((item, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "gallery-tile";
    button.style.setProperty("--delay", `${Math.min(index, 14) * 38}ms`);
    button.innerHTML = `
      <img src="${escapeAttr(item.thumbUrl)}" alt="${escapeAttr(item.title)}" loading="lazy" decoding="async">
      <span>
        <strong>${escapeHtml(item.title)}</strong>
        ${item.description ? `<small>${escapeHtml(item.description)}</small>` : ""}
        ${item.tags?.length ? `<em>${item.tags.map(escapeHtml).join(" / ")}</em>` : ""}
      </span>
    `;
    const img = button.querySelector("img");
    img.addEventListener("load", () => button.classList.add("is-loaded"), { once: true });
    button.addEventListener("click", () => openViewer(index));
    masonry.append(button);
  });
}

function renderTags() {
  const root = byId("galleryTags");
  const tags = Array.from(new Set(galleryItems.flatMap(item => item.tags || []))).filter(Boolean);
  root.replaceChildren();
  [{ id: "all", label: "全部" }, ...tags.map(tag => ({ id: tag, label: tag }))].forEach(tag => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = tag.id === activeTag ? "is-active" : "";
    button.textContent = tag.label;
    button.addEventListener("click", () => {
      activeTag = tag.id;
      renderTags();
      renderGallery();
    });
    root.append(button);
  });
}

function openViewer(index) {
  activeIndex = index;
  const item = visibleItems[activeIndex];
  if (!item) return;
  viewer.hidden = false;
  enterScreenFitView();
  viewerImage.alt = item.title || "画廊图片";
  viewerTitle.textContent = item.title || "画廊图片";
  viewerDescription.textContent = item.description || (item.tags || []).join(" / ");
  viewerOriginal.href = item.imageUrl;
  document.body.classList.add("gallery-viewer-open");

  viewer.classList.remove("is-ready", "is-entering");
  viewer.classList.add("is-loading", "is-preparing");
  requestViewerFullscreen().finally(() => {
    window.setTimeout(() => {
      viewer.classList.remove("is-preparing");
      viewer.classList.add("is-entering");
      window.setTimeout(() => viewer.classList.remove("is-entering"), 360);
    }, 80);
  });
  viewerImage.onload = null;
  viewerImage.onerror = null;
  viewerImage.onload = () => markViewerImageReady();
  viewerImage.onerror = () => markViewerImageReady();
  viewerImage.src = item.imageUrl;
  if (viewerImage.complete && viewerImage.naturalWidth > 0) {
    markViewerImageReady();
  }

  preloadNeighbor(1);
  preloadNeighbor(-1);
}

function moveViewer(step) {
  if (!visibleItems.length) return;
  activeIndex = (activeIndex + step + visibleItems.length) % visibleItems.length;
  openViewer(activeIndex);
}

async function toggleOriginalView() {
  if (figure.classList.contains("is-original-size")) {
    enterScreenFitView();
    return;
  }

  enterOriginalSizeView();
  requestViewerFullscreen();
}

function requestViewerFullscreen() {
  if (!document.fullscreenElement && viewer.requestFullscreen) {
    return viewer.requestFullscreen().catch(() => {});
  }
  return Promise.resolve();
}

function enterScreenFitView() {
  figure.classList.remove("is-original-size");
  figure.classList.add("is-screen-fit");
  viewerImage.style.removeProperty("width");
  viewerImage.style.removeProperty("height");
  byId("galleryFullscreen").textContent = "原图";
  flashViewerMode();
}

function enterOriginalSizeView() {
  figure.classList.remove("is-screen-fit");
  figure.classList.add("is-original-size");
  if (viewerImage.naturalWidth > 0) {
    viewerImage.style.width = `${viewerImage.naturalWidth}px`;
    viewerImage.style.height = `${viewerImage.naturalHeight}px`;
  }
  byId("galleryFullscreen").textContent = "恢复";
  flashViewerMode();
}

function markViewerImageReady() {
  viewer.classList.remove("is-loading");
  viewer.classList.add("is-ready");
}

function flashViewerMode() {
  figure.classList.remove("is-mode-changing");
  void figure.offsetWidth;
  figure.classList.add("is-mode-changing");
}

async function exitViewerFullscreen() {
  if (document.fullscreenElement && document.exitFullscreen) {
    await document.exitFullscreen().catch(() => {});
  }
}

async function closeViewer() {
  viewer.hidden = true;
  viewerImage.removeAttribute("src");
  viewer.classList.remove("is-loading", "is-ready", "is-entering", "is-preparing");
  figure.classList.remove("is-mode-changing");
  enterScreenFitView();
  await exitViewerFullscreen();
  document.body.classList.remove("gallery-viewer-open");
}

function preloadNeighbor(step) {
  if (!visibleItems.length) return;
  const item = visibleItems[(activeIndex + step + visibleItems.length) % visibleItems.length];
  if (!item?.imageUrl) return;
  const img = new Image();
  img.src = item.imageUrl;
}

function setHeroImage(item) {
  const hero = byId("galleryHero");
  if (!hero || !item?.imageUrl) return;
  hero.style.setProperty("--hero-image", `url("${cssUrl(item.imageUrl)}")`);
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

function byId(id) {
  return document.getElementById(id);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[char]);
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}

function cssUrl(value) {
  return String(value || "").replace(/["\\\n\r]/g, encodeURIComponent);
}
