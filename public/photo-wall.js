const shell = document.querySelector("[data-photo-wall]");
const stage = document.querySelector(".photo-wall-stage");
const track = document.querySelector("[data-photo-wall-track]");
const activeIndex = document.querySelector("[data-photo-wall-index]");
const totalCount = document.querySelector("[data-photo-wall-total]");
const activeTitle = document.querySelector("[data-photo-wall-title]");
const lightbox = document.querySelector("[data-photo-wall-lightbox]");
const lightboxImage = document.querySelector("[data-photo-wall-lightbox-image]");
const lightboxTitle = document.querySelector("[data-photo-wall-lightbox-title]");
const lightboxLink = document.querySelector("[data-photo-wall-lightbox-link]");
const closeButton = document.querySelector("[data-photo-wall-close]");

let items = [];
const state = {
  active: 0,
  current: 0,
  target: 0,
  min: 0,
  max: 0,
  velocity: 0,
  dragging: false,
  startX: 0,
  startTarget: 0,
  lastDelta: 0,
  moved: false,
  pointerId: null,
  raf: 0
};

init();

async function init() {
  if (!shell || !stage || !track) return;
  bindEvents();
  renderWall(await loadItems());
}

async function loadItems() {
  try {
    const response = await fetch("/api/catalog", { cache: "no-store" });
    if (!response.ok) throw new Error("catalog failed");
    const catalog = await response.json();
    const wall = (catalog.photoWall || []).filter(item => item.imageUrl || item.thumbUrl);
    if (wall.length) return wall;
    const gallery = (catalog.gallery || []).filter(item => item.imageUrl || item.thumbUrl);
    if (gallery.length) {
      return gallery.slice(0, 18).map(item => ({
        title: item.title,
        imageUrl: item.imageUrl,
        thumbUrl: item.thumbUrl,
        linkUrl: "/gallery.html",
        linkText: "GALLERY"
      }));
    }
  } catch {
    // Local fallback keeps the page interactive before catalog data arrives.
  }
  return fallbackItems();
}

function bindEvents() {
  stage.addEventListener("pointerdown", event => {
    event.preventDefault();
    state.dragging = true;
    state.pointerId = event.pointerId;
    state.startX = event.clientX;
    state.startTarget = state.target;
    state.lastDelta = 0;
    state.moved = false;
    stage.classList.add("is-dragging");
    stage.setPointerCapture?.(event.pointerId);
    animate();
  });

  document.addEventListener("pointermove", event => {
    if (!state.dragging) return;
    event.preventDefault();
    const delta = event.clientX - state.startX;
    state.velocity = delta - state.lastDelta;
    state.lastDelta = delta;
    state.target = clamp(state.startTarget + delta, state.min, state.max);
    state.moved = state.moved || Math.abs(delta) > 5;
    updateActiveFromCenter();
  });

  document.addEventListener("pointerup", finishDrag);
  document.addEventListener("pointercancel", finishDrag);

  track.addEventListener("click", event => {
    const card = event.target.closest(".photo-wall-card");
    if (!card || state.moved) return;
    openItem(Number(card.dataset.index || 0));
  });

  track.addEventListener("dragstart", event => event.preventDefault());
  closeButton?.addEventListener("click", closeLightbox);
  lightbox?.addEventListener("click", event => {
    if (event.target === lightbox) closeLightbox();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeLightbox();
  });
  window.addEventListener("resize", debounce(updateBounds, 120));
}

function finishDrag(event) {
  if (!state.dragging) return;
  if (state.pointerId !== null && event.pointerId !== state.pointerId) return;
  state.dragging = false;
  state.pointerId = null;
  stage.classList.remove("is-dragging");
  state.target = clamp(state.target + state.velocity * 22, state.min, state.max);
  state.velocity *= 0.82;
  animate();
}

function renderWall(source) {
  const base = source.length ? source : fallbackItems();
  const repeated = [];
  while (repeated.length < 30) repeated.push(...base);
  items = repeated.slice(0, Math.max(30, base.length));
  track.replaceChildren();

  items.forEach((item, index) => {
    const card = document.createElement("button");
    card.className = "photo-wall-card";
    card.type = "button";
    card.dataset.index = String(index);
    card.ariaLabel = item.title || `Photo ${index + 1}`;
    card.draggable = false;

    const image = document.createElement("img");
    image.src = item.thumbUrl || item.imageUrl;
    image.alt = item.title || "";
    image.decoding = "async";
    image.loading = index < 12 ? "eager" : "lazy";
    image.draggable = false;
    card.append(image);

    card.addEventListener("mouseenter", () => setActive(index));
    card.addEventListener("focus", () => setActive(index));
    track.append(card);
  });

  setActive(0);
  requestAnimationFrame(() => {
    state.current = 0;
    state.target = 0;
    updateBounds();
    animate();
  });
}

function animate() {
  if (state.raf) return;
  const frame = () => {
    state.raf = 0;
    state.current += (state.target - state.current) * 0.13;
    state.velocity *= state.dragging ? 0.92 : 0.88;
    track.style.transform = `translate3d(${state.current}px, 0, 0)`;

    const cards = [...track.children];
    cards.forEach((card, index) => {
      const phase = index * 0.68 + state.current * 0.018;
      const pull = clamp(state.velocity * (0.28 + (index % 6) * 0.025), -28, 28);
      const wave = Math.sin(phase) * 12 + pull;
      const tilt = clamp(state.velocity * 0.018 + Math.sin(phase * 0.7) * 0.9, -5, 5);
      const stretch = 1 + Math.min(Math.abs(state.velocity) * 0.002, 0.05);
      card.style.transform = `translate3d(0, ${wave}px, 0) rotate(${tilt}deg) scaleY(${stretch})`;
      card.style.zIndex = String(100 - Math.round(Math.abs(index - state.active)));
    });

    const settled = Math.abs(state.target - state.current) < 0.35 && Math.abs(state.velocity) < 0.06;
    if (!settled || state.dragging) {
      state.raf = requestAnimationFrame(frame);
    }
  };
  state.raf = requestAnimationFrame(frame);
}

function updateBounds() {
  const overflow = track.scrollWidth - stage.clientWidth;
  const edge = Math.max(36, stage.clientWidth * 0.09);
  state.max = edge;
  state.min = overflow > 0 ? -overflow - edge : 0;
  state.target = clamp(state.target, state.min, state.max);
  state.current = clamp(state.current, state.min, state.max);
}

function updateActiveFromCenter() {
  const center = stage.clientWidth / 2 - state.current;
  let next = 0;
  let distance = Infinity;
  [...track.children].forEach((card, index) => {
    const cardCenter = card.offsetLeft + card.offsetWidth / 2;
    const cardDistance = Math.abs(cardCenter - center);
    if (cardDistance < distance) {
      next = index;
      distance = cardDistance;
    }
  });
  setActive(next);
}

function setActive(index) {
  state.active = index;
  const item = items[index];
  [...track.children].forEach((card, cardIndex) => {
    card.classList.toggle("is-active", cardIndex === index);
  });
  if (activeIndex) activeIndex.textContent = String((index % 30) + 1).padStart(2, "0");
  if (totalCount) totalCount.textContent = String(Math.min(items.length, 30)).padStart(2, "0");
  if (activeTitle && item) activeTitle.textContent = item.title || "NSY Gallery";
}

function openItem(index) {
  const item = items[index];
  if (!item || !lightbox || !lightboxImage) return;
  setActive(index);
  lightboxImage.src = item.imageUrl || item.thumbUrl;
  lightboxImage.alt = item.title || "";
  if (lightboxTitle) lightboxTitle.textContent = item.title || "PHOTO";
  if (lightboxLink) {
    lightboxLink.href = item.linkUrl || "/gallery.html";
    lightboxLink.textContent = item.linkText || "OPEN";
    lightboxLink.hidden = !item.linkUrl;
  }
  lightbox.hidden = false;
}

function closeLightbox() {
  if (lightbox) lightbox.hidden = true;
}

function fallbackItems() {
  return [
    { title: "Gallery 01", imageUrl: "/2.jpg" },
    { title: "Gallery 02", imageUrl: "/3.jpg" },
    { title: "Gallery 03", imageUrl: "/4.jpg" },
    { title: "Gallery 04", imageUrl: "/5.jpg" },
    { title: "Gallery 05", imageUrl: "/6.jpg" },
    { title: "Assistant", imageUrl: "/assistant-preview.jpg" },
    { title: "Datacenter", imageUrl: "/datacenter-preview.jpg" },
    { title: "App", imageUrl: "/app-preview.png" }
  ];
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function debounce(fn, delay = 120) {
  let timer = null;
  return (...args) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), delay);
  };
}
