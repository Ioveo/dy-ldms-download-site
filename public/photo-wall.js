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
  lastTime: 0,
  moved: false,
  pointerId: null,
  clickIndex: null,
  wavePower: 0,
  raf: 0
};
const lightboxDrag = {
  active: false,
  pointerId: null,
  startX: 0,
  startY: 0,
  lastX: 0,
  lastY: 0,
  lastTime: 0,
  velocity: 0,
  distance: 0
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
    const card = event.target.closest?.(".photo-wall-card");
    state.dragging = true;
    state.pointerId = event.pointerId;
    state.clickIndex = card ? Number(card.dataset.index || 0) : null;
    state.startX = event.clientX;
    state.startTarget = state.target;
    state.lastDelta = 0;
    state.lastTime = performance.now();
    state.moved = false;
    stage.classList.add("is-dragging");
    stage.setPointerCapture?.(event.pointerId);
    animate();
  });

  document.addEventListener("pointermove", event => {
    if (!state.dragging) return;
    event.preventDefault();
    const delta = event.clientX - state.startX;
    const now = performance.now();
    const elapsed = Math.max(8, now - state.lastTime);
    const frameVelocity = ((delta - state.lastDelta) / elapsed) * 16.67;
    state.velocity = lerp(state.velocity, frameVelocity, 0.38);
    state.wavePower = lerp(state.wavePower, frameVelocity, 0.42);
    state.lastTime = now;
    state.lastDelta = delta;
    state.target = clamp(state.startTarget + delta, state.min, state.max);
    state.moved = state.moved || Math.abs(delta) > 8;
    updateActiveFromCenter();
  });

  document.addEventListener("pointerup", finishDrag);
  document.addEventListener("pointercancel", finishDrag);

  track.addEventListener("click", event => {
    event.preventDefault();
  });

  track.addEventListener("dragstart", event => event.preventDefault());
  shell.addEventListener("wheel", event => {
    event.preventDefault();
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    const push = clamp(-delta * 1.55, -280, 280);
    state.velocity = lerp(state.velocity, push * 0.36, 0.55);
    state.wavePower = lerp(state.wavePower, push * 0.62, 0.55);
    state.target = clamp(state.target + push, state.min, state.max);
    updateActiveFromCenter();
    animate();
  }, { passive: false });
  closeButton?.addEventListener("click", closeLightbox);
  lightbox?.addEventListener("click", event => {
    if (event.target === lightbox) closeLightbox();
  });
  lightboxImage?.addEventListener("pointerdown", startLightboxDrag);
  document.addEventListener("pointermove", moveLightboxDrag);
  document.addEventListener("pointerup", finishLightboxDrag);
  document.addEventListener("pointercancel", finishLightboxDrag);
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
  if (!state.moved && state.clickIndex !== null) {
    openItem(state.clickIndex);
    state.clickIndex = null;
    state.velocity = 0;
    state.wavePower = 0;
    return;
  }
  state.clickIndex = null;
  state.target = clamp(state.target + state.velocity * 34, state.min, state.max);
  state.velocity *= 0.9;
  state.wavePower = state.velocity;
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
    const ease = state.dragging ? 0.22 : 0.075;
    state.current += (state.target - state.current) * ease;
    state.velocity *= state.dragging ? 0.94 : 0.93;
    state.wavePower *= state.dragging ? 0.95 : 0.91;
    track.style.transform = `translate3d(${state.current}px, 0, 0)`;

    const cards = [...track.children];
    const center = stage.clientWidth / 2 - state.current;
    cards.forEach((card, index) => {
      const cardCenter = card.offsetLeft + card.offsetWidth / 2;
      const distance = Math.abs(cardCenter - center);
      const proximity = Math.max(0, 1 - distance / Math.max(1, stage.clientWidth * 0.48));
      const centerBoost = 1 + proximity * 0.7;
      const phase = index * 0.62 + state.current * 0.014;
      const speed = Math.min(Math.abs(state.wavePower), 180);
      const ripple = (10 + speed * 0.58) * centerBoost;
      const lift = -proximity * (46 + speed * 0.12);
      const lag = clamp(state.wavePower * (0.2 + (index % 8) * 0.021), -54, 54);
      const wave = Math.sin(phase) * ripple + clamp(state.wavePower * 0.22, -48, 48) + lift;
      const tilt = clamp(state.wavePower * 0.038 + Math.sin(phase * 0.7) * (1.4 + speed * 0.014), -13, 13);
      const rotateX = -proximity * (5 + speed * 0.025);
      const scale = 1 + proximity * 0.16 + Math.min(speed * 0.00036, 0.08);
      const stretch = 1 + Math.min(speed * 0.0009, 0.12);
      card.style.transform = `translate3d(${lag}px, ${wave}px, ${proximity * 56}px) rotateX(${rotateX}deg) rotate(${tilt}deg) scale(${scale}, ${scale * stretch})`;
      card.style.filter = `drop-shadow(0 ${Math.round(20 + proximity * 42)}px ${Math.round(18 + proximity * 34)}px rgba(0,0,0,${0.28 + proximity * 0.24}))`;
      card.style.zIndex = String(100 - Math.round(Math.abs(index - state.active)));
    });

    const settled = Math.abs(state.target - state.current) < 0.35 && Math.abs(state.velocity) < 0.06 && Math.abs(state.wavePower) < 0.06;
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
  resetLightboxDragStyle();
}

function closeLightbox() {
  if (!lightbox) return;
  lightbox.hidden = true;
  resetLightboxDragStyle();
}

function startLightboxDrag(event) {
  if (!lightbox || lightbox.hidden) return;
  event.preventDefault();
  lightboxDrag.active = true;
  lightboxDrag.pointerId = event.pointerId;
  lightboxDrag.startX = event.clientX;
  lightboxDrag.startY = event.clientY;
  lightboxDrag.lastX = event.clientX;
  lightboxDrag.lastY = event.clientY;
  lightboxDrag.lastTime = performance.now();
  lightboxDrag.velocity = 0;
  lightboxDrag.distance = 0;
  lightbox.classList.add("is-dragging");
  lightboxImage?.setPointerCapture?.(event.pointerId);
}

function moveLightboxDrag(event) {
  if (!lightboxDrag.active) return;
  if (lightboxDrag.pointerId !== null && event.pointerId !== lightboxDrag.pointerId) return;
  event.preventDefault();
  const dx = event.clientX - lightboxDrag.startX;
  const dy = event.clientY - lightboxDrag.startY;
  const now = performance.now();
  const elapsed = Math.max(8, now - lightboxDrag.lastTime);
  const frameDistance = Math.hypot(event.clientX - lightboxDrag.lastX, event.clientY - lightboxDrag.lastY);
  lightboxDrag.velocity = lerp(lightboxDrag.velocity, (frameDistance / elapsed) * 16.67, 0.45);
  lightboxDrag.distance = Math.hypot(dx, dy);
  lightboxDrag.lastX = event.clientX;
  lightboxDrag.lastY = event.clientY;
  lightboxDrag.lastTime = now;

  const opacity = clamp(1 - lightboxDrag.distance / 520, 0.35, 1);
  const scale = clamp(1 - lightboxDrag.distance / 1800, 0.86, 1);
  if (lightboxImage) {
    lightboxImage.style.transform = `translate3d(${dx}px, ${dy}px, 0) scale(${scale})`;
    lightboxImage.style.opacity = String(opacity);
  }
}

function finishLightboxDrag(event) {
  if (!lightboxDrag.active) return;
  if (lightboxDrag.pointerId !== null && event.pointerId !== lightboxDrag.pointerId) return;
  const shouldClose = lightboxDrag.distance > 150 || lightboxDrag.velocity > 18;
  lightboxDrag.active = false;
  lightboxDrag.pointerId = null;
  lightbox?.classList.remove("is-dragging");
  if (shouldClose) {
    closeLightbox();
  } else {
    resetLightboxDragStyle();
  }
}

function resetLightboxDragStyle() {
  if (!lightboxImage) return;
  lightboxImage.style.transform = "";
  lightboxImage.style.opacity = "";
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

function lerp(from, to, amount) {
  return from + (to - from) * amount;
}

function debounce(fn, delay = 120) {
  let timer = null;
  return (...args) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), delay);
  };
}
