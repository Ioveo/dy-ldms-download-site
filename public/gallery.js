let activeTag = "all";
let galleryItems = [];

const masonry = byId("galleryMasonry");
const viewer = byId("galleryViewer");
const viewerImage = byId("galleryViewerImage");
const viewerTitle = byId("galleryViewerTitle");
const viewerDescription = byId("galleryViewerDescription");
const figure = byId("galleryFigure");

loadGallery();

byId("galleryClose").addEventListener("click", closeViewer);
viewer.addEventListener("click", event => {
  if (event.target === viewer) closeViewer();
});
viewerImage.addEventListener("click", () => {
  figure.classList.toggle("is-fullscreen");
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && !viewer.hidden) closeViewer();
});

async function loadGallery() {
  try {
    const response = await fetch("/api/catalog", { cache: "no-store" });
    if (!response.ok) throw new Error("catalog request failed");
    const catalog = await response.json();
    renderNavigation(catalog);
    galleryItems = (catalog.gallery || []).filter(item => item.imageUrl);
    renderTags();
    renderGallery();
  } catch {
    masonry.innerHTML = `<p class="gallery-empty">画廊暂时不可用。</p>`;
  }
}

function renderGallery() {
  const items = galleryItems.filter(item => activeTag === "all" || (item.tags || []).includes(activeTag));
  byId("galleryCount").textContent = `${items.length} 张图片`;
  masonry.replaceChildren();
  if (!items.length) {
    masonry.innerHTML = `<p class="gallery-empty">还没有可展示的图片。</p>`;
    return;
  }

  items.forEach((item, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "gallery-tile";
    button.style.setProperty("--delay", `${Math.min(index, 12) * 45}ms`);
    button.innerHTML = `
      <img src="${escapeAttr(item.thumbUrl || item.imageUrl)}" alt="${escapeAttr(item.title)}" loading="lazy">
      <span>
        <strong>${escapeHtml(item.title)}</strong>
        ${item.description ? `<small>${escapeHtml(item.description)}</small>` : ""}
      </span>
    `;
    button.addEventListener("click", () => openViewer(item));
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

function openViewer(item) {
  viewer.hidden = false;
  figure.classList.remove("is-fullscreen");
  viewerImage.src = item.imageUrl;
  viewerImage.alt = item.title || "画廊图片";
  viewerTitle.textContent = item.title || "画廊图片";
  viewerDescription.textContent = item.description || (item.tags || []).join(" / ");
  document.body.classList.add("gallery-viewer-open");
}

function closeViewer() {
  viewer.hidden = true;
  viewerImage.removeAttribute("src");
  document.body.classList.remove("gallery-viewer-open");
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
