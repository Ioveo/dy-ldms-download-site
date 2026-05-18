let activeTag = "all";
let searchText = "";
let galleryItems = [];
let visibleItems = [];
let activeIndex = -1;
let openingAnimation = null;

const masonry = byId("galleryMasonry");
const viewer = byId("galleryViewer");
const viewerImage = byId("galleryViewerImage");
const viewerTitle = byId("galleryViewerTitle");
const viewerDescription = byId("galleryViewerDescription");
const viewerOriginal = byId("galleryOriginal");
const viewerBackdrop = byId("galleryBackdrop");
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
    setHeroImage(heroBackgroundItem(galleryItems));
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
    button.addEventListener("click", () => openViewer(index, button));
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

function openViewer(index, tile) {
  activeIndex = index;
  const item = visibleItems[activeIndex];
  if (!item) return;
  const sourceImage = tile?.querySelector("img");
  viewer.hidden = false;
  enterScreenFitView();
  viewerImage.alt = item.title || "画廊图片";
  viewerTitle.textContent = item.title || "画廊图片";
  viewerDescription.textContent = item.description || (item.tags || []).join(" / ");
  viewerOriginal.href = item.imageUrl;
  viewerBackdrop.style.backgroundImage = `url("${cssUrl(item.imageUrl)}")`;
  document.body.classList.add("gallery-viewer-open");

  viewer.classList.remove("is-ready", "is-entering");
  viewer.classList.add("is-loading");
  if (sourceImage) {
    viewer.classList.add("is-zooming");
  } else {
    viewer.classList.add("is-entering");
    window.setTimeout(() => viewer.classList.remove("is-entering"), 260);
  }
  viewerImage.onload = null;
  viewerImage.onerror = null;
  viewerImage.onload = () => revealViewerImage(sourceImage);
  viewerImage.onerror = () => revealViewerImage(sourceImage);
  viewerImage.src = item.imageUrl;
  if (viewerImage.complete && viewerImage.naturalWidth > 0) {
    revealViewerImage(sourceImage);
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
  if (figure.classList.contains("is-compact-size")) {
    enterScreenFitView();
    return;
  }

  enterCompactView();
}

function enterScreenFitView() {
  figure.classList.remove("is-compact-size", "is-original-size");
  figure.classList.add("is-screen-fit");
  viewerImage.style.removeProperty("width");
  viewerImage.style.removeProperty("height");
  byId("galleryFullscreen").textContent = "缩小";
  flashViewerMode();
}

function enterCompactView() {
  figure.classList.remove("is-screen-fit");
  figure.classList.add("is-compact-size");
  viewerImage.style.removeProperty("width");
  viewerImage.style.removeProperty("height");
  byId("galleryFullscreen").textContent = "放大";
  flashViewerMode();
}

function markViewerImageReady() {
  viewer.classList.remove("is-loading");
  viewer.classList.add("is-ready");
}

function revealViewerImage(sourceImage) {
  viewerImage.onload = null;
  viewerImage.onerror = null;
  if (!sourceImage || !sourceImage.getBoundingClientRect) {
    markViewerImageReady();
    return;
  }

  animateViewerImageFromThumbnail(sourceImage).finally(() => {
    viewer.classList.remove("is-zooming");
    markViewerImageReady();
  });
}

async function animateViewerImageFromThumbnail(sourceImage) {
  if (openingAnimation) openingAnimation.cancel();
  const from = sourceImage.getBoundingClientRect();
  const to = targetImageRect();
  if (!from.width || !from.height || !to.width || !to.height) return;

  markViewerImageReady();
  viewerImage.classList.add("is-opening");
  Object.assign(viewerImage.style, {
    position: "fixed",
    zIndex: "95",
    left: `${from.left}px`,
    top: `${from.top}px`,
    width: `${from.width}px`,
    height: `${from.height}px`,
    maxWidth: "none",
    maxHeight: "none",
    objectFit: "cover",
    transform: "none"
  });

  openingAnimation = viewerImage.animate([
    { left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, height: `${from.height}px`, opacity: 1 },
    { left: `${to.left}px`, top: `${to.top}px`, width: `${to.width}px`, height: `${to.height}px`, opacity: 1 }
  ], {
    duration: 420,
    easing: "cubic-bezier(0.18, 0.88, 0.32, 1)"
  });

  await openingAnimation.finished.catch(() => {});
  openingAnimation = null;
  viewerImage.classList.remove("is-opening");
  clearOpeningImageStyle();
}

function targetImageRect() {
  const gap = window.innerWidth <= 760 ? 24 : 56;
  const maxWidth = Math.max(1, window.innerWidth - gap);
  const maxHeight = Math.max(1, window.innerHeight - gap);
  const naturalWidth = viewerImage.naturalWidth || maxWidth;
  const naturalHeight = viewerImage.naturalHeight || maxHeight;
  const scale = Math.min(maxWidth / naturalWidth, maxHeight / naturalHeight, 1);
  const width = Math.max(1, naturalWidth * scale);
  const height = Math.max(1, naturalHeight * scale);
  return {
    left: (window.innerWidth - width) / 2,
    top: (window.innerHeight - height) / 2,
    width,
    height
  };
}

function clearOpeningImageStyle() {
  ["position", "zIndex", "left", "top", "maxWidth", "maxHeight", "objectFit", "transform"].forEach(prop => {
    viewerImage.style.removeProperty(prop);
  });
  if (!figure.classList.contains("is-original-size")) {
    viewerImage.style.removeProperty("width");
    viewerImage.style.removeProperty("height");
  }
}

function flashViewerMode() {
  figure.classList.remove("is-mode-changing");
  void figure.offsetWidth;
  figure.classList.add("is-mode-changing");
}

function closeViewer() {
  if (openingAnimation) {
    openingAnimation.cancel();
    openingAnimation = null;
  }
  viewer.hidden = true;
  viewerImage.removeAttribute("src");
  viewerBackdrop.style.removeProperty("background-image");
  viewerImage.classList.remove("is-opening");
  clearOpeningImageStyle();
  viewer.classList.remove("is-loading", "is-ready", "is-entering", "is-zooming");
  figure.classList.remove("is-mode-changing", "is-compact-size", "is-original-size");
  enterScreenFitView();
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
  hero.style.setProperty("--hero-image", `url("${cssUrl(withCacheBust(item.imageUrl, galleryTime(item)))}")`);
  hero.classList.add("has-hero-image");
}

function heroBackgroundItem(items) {
  if (!items.length) return null;
  return latestGalleryItem(items.filter(item => item.imageUrl));
}

function latestGalleryItem(items) {
  return [...items].sort((a, b) => galleryTime(b) - galleryTime(a))[0] || null;
}

function galleryTime(item) {
  const value = item?.updatedAt || item?.createdAt || 0;
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) return numeric;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
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

function withCacheBust(url, version) {
  if (!url || !version) return url;
  const joiner = String(url).includes("?") ? "&" : "?";
  return `${url}${joiner}v=${encodeURIComponent(version)}`;
}
