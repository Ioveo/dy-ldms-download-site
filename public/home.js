const tabs = [...document.querySelectorAll("[data-extension-tab]")];
const cards = [...document.querySelectorAll("[data-extension-card]")];
const row = document.querySelector("[data-extension-row]");
const homeNav = document.querySelector("[data-nav]");

const aiPrompts = [...document.querySelectorAll("[data-ai-slide]")];
const aiStage = document.querySelector("[data-ai-stage]");
const aiMedia = document.querySelector("[data-ai-media]");
const aiDots = document.querySelector("[data-ai-dots]");
const aiNext = document.querySelector("[data-ai-next]");
const aiCommandList = document.querySelector("[data-ai-command-list]");
const aiKicker = document.querySelector("[data-ai-kicker]");
const aiTitle = document.querySelector("[data-ai-title]");
const aiDescription = document.querySelector("[data-ai-description]");
const aiSuggestion = document.querySelector("[data-ai-suggestion]");
const photoWall = document.querySelector("[data-photo-wall]");
const photoWallTrack = document.querySelector("[data-photo-wall-track]");
const photoWallTitle = document.querySelector("[data-photo-wall-title]");
const photoWallLink = document.querySelector("[data-photo-wall-link]");
const photoWallCount = document.querySelector("[data-photo-wall-count]");

let aiSlides = [];
let activeAiSlide = 0;
let aiTimer = null;
let photoWallItems = [];
const photoWallState = {
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
  raf: 0
};

if (tabs.length && cards.length && row) {
  tabs.forEach(tab => {
    tab.addEventListener("click", () => focusExtension(tab.dataset.extensionTab));
  });
}

initAiCarousel();
initPhotoWall();

function focusExtension(key) {
  const card = cards.find(item => item.dataset.extensionCard === key);
  if (!card) return;

  tabs.forEach(tab => tab.classList.toggle("is-active", tab.dataset.extensionTab === key));
  cards.forEach(item => item.classList.toggle("is-focused", item === card));

  row.scrollTo({
    left: card.offsetLeft - row.offsetLeft,
    behavior: "smooth"
  });
}

async function initAiCarousel() {
  if (!aiStage || !aiMedia) return;
  aiSlides = await loadAiSlides();
  renderAiImages();
  renderAiCommands();
  renderAiDots();
  setAiSlide(0);
  startAiCarousel();

  aiPrompts.forEach(prompt => {
    prompt.addEventListener("click", () => {
      setAiSlide(Number(prompt.dataset.aiSlide || 0));
      startAiCarousel();
    });
  });

  aiNext?.addEventListener("click", () => {
    setAiSlide(activeAiSlide + 1);
    startAiCarousel();
  });

  aiStage.addEventListener("mouseenter", stopAiCarousel);
  aiStage.addEventListener("mouseleave", startAiCarousel);
}

async function loadAiSlides() {
  try {
    const response = await fetch("/api/catalog", { cache: "no-store" });
    if (!response.ok) throw new Error("catalog request failed");
    const catalog = await response.json();
    applySiteText(catalog.site || {});
    renderNavigation(catalog.navigation || []);
    renderPhotoWall(catalog.photoWall || []);
    const carousel = (catalog.siteCarousel || [])
      .filter(item => item.imageUrl)
      .slice(0, 6)
      .map((item, index) => slideFromCarousel(item, index));
    if (carousel.length) return carousel;
  } catch {
    // Static slides keep the section useful before images are added in admin.
  }
  return fallbackAiSlides();
}

function renderNavigation(items) {
  if (!homeNav || !Array.isArray(items) || !items.length) return;
  homeNav.replaceChildren();
  for (const item of items.filter(entry => entry.status !== "disabled" && !isAdminHref(entry.href))) {
    const link = document.createElement("a");
    link.href = item.href;
    link.textContent = item.label;
    if (item.external) {
      link.target = "_blank";
      link.rel = "noopener";
    }
    homeNav.append(link);
  }
}

function isAdminHref(href = "") {
  return href.includes("/admin") || href.includes("/lvtuang");
}

function initPhotoWall() {
  if (!photoWall || !photoWallTrack) return;
  renderPhotoWall([]);

  photoWall.addEventListener("pointerdown", event => {
    photoWallState.dragging = true;
    photoWallState.startX = event.clientX;
    photoWallState.startTarget = photoWallState.target;
    photoWallState.lastDelta = 0;
    photoWallState.moved = false;
    photoWall.classList.add("is-dragging");
    photoWall.setPointerCapture?.(event.pointerId);
    animatePhotoWall();
  });

  photoWall.addEventListener("pointermove", event => {
    if (!photoWallState.dragging) return;
    const delta = event.clientX - photoWallState.startX;
    photoWallState.velocity = delta - photoWallState.lastDelta;
    photoWallState.lastDelta = delta;
    photoWallState.target = clamp(photoWallState.startTarget + delta, photoWallState.min, photoWallState.max);
    photoWallState.moved = photoWallState.moved || Math.abs(delta) > 6;
    updatePhotoWallActive();
  });

  for (const eventName of ["pointerup", "pointercancel", "lostpointercapture"]) {
    photoWall.addEventListener(eventName, () => {
      if (!photoWallState.dragging) return;
      photoWallState.dragging = false;
      photoWall.classList.remove("is-dragging");
      photoWallState.target = clamp(photoWallState.target + photoWallState.velocity * 18, photoWallState.min, photoWallState.max);
      photoWallState.velocity *= 0.82;
      animatePhotoWall();
    });
  }

  photoWall.addEventListener("click", event => {
    if (!photoWallState.moved) return;
    event.preventDefault();
    event.stopPropagation();
  }, true);

  window.addEventListener("resize", debounce(updatePhotoWallBounds, 120));
}

function renderPhotoWall(items) {
  if (!photoWall || !photoWallTrack) return;
  const source = (items || []).filter(item => item.imageUrl || item.thumbUrl);
  const base = source.length ? source : fallbackPhotoWallItems();
  const repeated = [];
  while (repeated.length < 24) repeated.push(...base);
  photoWallItems = repeated.slice(0, Math.max(24, base.length));

  photoWallTrack.replaceChildren();
  photoWallItems.forEach((item, index) => {
    const card = document.createElement(item.linkUrl ? "a" : "button");
    card.className = "photo-wall-card";
    card.dataset.photoIndex = String(index);
    if (item.linkUrl) {
      card.href = item.linkUrl;
      card.target = "_self";
    } else {
      card.type = "button";
    }
    card.ariaLabel = item.title || `Photo ${index + 1}`;

    const image = document.createElement("img");
    image.src = item.thumbUrl || item.imageUrl;
    image.alt = item.title || "";
    image.decoding = "async";
    image.loading = index < 10 ? "eager" : "lazy";
    card.append(image);
    card.addEventListener("mouseenter", () => setPhotoWallActive(index));
    card.addEventListener("focus", () => setPhotoWallActive(index));
    photoWallTrack.append(card);
  });

  setPhotoWallActive(0);
  requestAnimationFrame(() => {
    photoWallState.current = 0;
    photoWallState.target = 0;
    updatePhotoWallBounds();
    animatePhotoWall();
  });
}

function fallbackPhotoWallItems() {
  return [
    { title: "Gallery 01", imageUrl: "/2.jpg", linkUrl: "/gallery.html" },
    { title: "Gallery 02", imageUrl: "/3.jpg", linkUrl: "/gallery.html" },
    { title: "Gallery 03", imageUrl: "/4.jpg", linkUrl: "/gallery.html" },
    { title: "Gallery 04", imageUrl: "/5.jpg", linkUrl: "/gallery.html" },
    { title: "Gallery 05", imageUrl: "/6.jpg", linkUrl: "/gallery.html" },
    { title: "Assistant", imageUrl: "/assistant-preview.jpg", linkUrl: "/gallery.html" },
    { title: "Datacenter", imageUrl: "/datacenter-preview.jpg", linkUrl: "/gallery.html" },
    { title: "App", imageUrl: "/app-preview.png", linkUrl: "/gallery.html" }
  ];
}

function updatePhotoWallBounds() {
  if (!photoWall || !photoWallTrack) return;
  const overflow = photoWallTrack.scrollWidth - photoWall.clientWidth;
  const edge = Math.max(24, photoWall.clientWidth * 0.08);
  photoWallState.max = edge;
  photoWallState.min = overflow > 0 ? -overflow - edge : 0;
  photoWallState.target = clamp(photoWallState.target, photoWallState.min, photoWallState.max);
  photoWallState.current = clamp(photoWallState.current, photoWallState.min, photoWallState.max);
}

function animatePhotoWall() {
  if (!photoWallTrack) return;
  if (photoWallState.raf) return;
  const frame = () => {
    photoWallState.raf = 0;
    photoWallState.current += (photoWallState.target - photoWallState.current) * 0.12;
    photoWallState.velocity *= photoWallState.dragging ? 0.92 : 0.88;
    photoWallTrack.style.transform = `translate3d(${photoWallState.current}px, 0, 0)`;

    const cards = [...photoWallTrack.children];
    cards.forEach((card, index) => {
      const phase = index * 0.72 + photoWallState.current * 0.018;
      const pull = clamp(photoWallState.velocity * (0.22 + (index % 5) * 0.025), -22, 22);
      const wave = Math.sin(phase) * 12 + pull;
      const tilt = clamp(photoWallState.velocity * 0.018 + Math.sin(phase * 0.72) * 0.9, -5, 5);
      const stretch = 1 + Math.min(Math.abs(photoWallState.velocity) * 0.0018, 0.045);
      card.style.transform = `translate3d(0, ${wave}px, 0) rotate(${tilt}deg) scaleY(${stretch})`;
      card.style.zIndex = String(100 - Math.round(Math.abs(index - photoWallState.active)));
    });

    const settled = Math.abs(photoWallState.target - photoWallState.current) < 0.35 && Math.abs(photoWallState.velocity) < 0.06;
    if (!settled || photoWallState.dragging) {
      photoWallState.raf = requestAnimationFrame(frame);
    } else {
      cards.forEach((card, index) => {
        const wave = Math.sin(index * 0.72 + photoWallState.current * 0.018) * 4;
        card.style.transform = `translate3d(0, ${wave}px, 0)`;
      });
    }
  };
  photoWallState.raf = requestAnimationFrame(frame);
}

function updatePhotoWallActive() {
  if (!photoWall || !photoWallTrack?.children.length) return;
  const center = photoWall.clientWidth / 2 - photoWallState.current;
  let next = 0;
  let distance = Infinity;
  [...photoWallTrack.children].forEach((card, index) => {
    const itemCenter = card.offsetLeft + card.offsetWidth / 2;
    const itemDistance = Math.abs(itemCenter - center);
    if (itemDistance < distance) {
      distance = itemDistance;
      next = index;
    }
  });
  setPhotoWallActive(next);
}

function setPhotoWallActive(index) {
  photoWallState.active = index;
  const item = photoWallItems[index];
  [...(photoWallTrack?.children || [])].forEach((card, cardIndex) => {
    card.classList.toggle("is-active", cardIndex === index);
  });
  if (photoWallTitle && item) photoWallTitle.textContent = item.title || "NSY Gallery";
  if (photoWallLink && item?.linkUrl) photoWallLink.href = item.linkUrl;
  if (photoWallCount) photoWallCount.textContent = `${String((index % Math.max(1, Math.min(photoWallItems.length, 24))) + 1).padStart(2, "0")} / PHOTO WALL`;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function applySiteText(site) {
  for (const element of document.querySelectorAll("[data-site-text]")) {
    const key = element.dataset.siteText;
    if (site[key]) element.textContent = site[key];
  }
}

function slideFromCarousel(item, index) {
  const templates = [
    { kicker: "素材洞察", suggestion: "这张素材适合作为画廊主推，建议同步放入首页动态区域提高点击率。" },
    { kicker: "直播话术", suggestion: "围绕画面主体生成开场话术，并关联下载中心入口形成转化路径。" },
    { kicker: "标签整理", suggestion: "根据图片说明和标签自动归类，方便用户在画廊里按场景筛选。" }
  ];
  const template = templates[index % templates.length];
  return {
    imageUrl: item.thumbUrl || item.imageUrl,
    title: item.title || `后台素材 ${index + 1}`,
    description: item.description || (item.tags || []).join(" / ") || "来自后台系统管理的图片素材。",
    kicker: template.kicker,
    suggestion: item.suggestion || template.suggestion
  };
}

function fallbackAiSlides() {
  return [
    {
      title: "等待后台图片",
      description: "在后台系统管理里添加图片后，这里会自动替换为真实素材轮播。",
      kicker: "素材洞察",
      suggestion: "先上传产品截图、直播现场或素材封面，AI 区域会自动形成动态展示。"
    },
    {
      title: "生成直播话术",
      description: "围绕软件、音乐、图库和授权入口生成运营说明。",
      kicker: "直播话术",
      suggestion: "把主推素材和下载入口组合成一句清晰的直播引导。"
    },
    {
      title: "整理素材标签",
      description: "把图片、文章、音乐素材归纳成用户能理解的入口。",
      kicker: "标签整理",
      suggestion: "建议使用场景标签：直播、下载、教程、授权、音乐。"
    }
  ];
}

function renderAiImages() {
  const fallback = aiMedia.querySelector(".ai-fallback-card");
  aiSlides.forEach((slide, index) => {
    if (!slide.imageUrl) return;
    const image = document.createElement("img");
    image.src = slide.imageUrl;
    image.alt = slide.title;
    image.decoding = "async";
    image.loading = index ? "lazy" : "eager";
    aiMedia.append(image);
  });
  if (fallback && aiSlides.some(slide => slide.imageUrl)) fallback.remove();
}

function renderAiDots() {
  if (!aiDots) return;
  aiDots.replaceChildren();
  aiSlides.forEach((_, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.ariaLabel = `查看第 ${index + 1} 张 AI 素材`;
    const fill = document.createElement("span");
    button.append(fill);
    button.addEventListener("click", () => {
      setAiSlide(index);
      startAiCarousel();
    });
    aiDots.append(button);
  });
}

function renderAiCommands() {
  if (!aiCommandList) return;
  const label = aiCommandList.querySelector("span")?.textContent || "Tiancaimao AI";
  aiCommandList.replaceChildren();
  const heading = document.createElement("span");
  heading.textContent = label;
  aiCommandList.append(heading);
  aiSlides.forEach((slide, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.aiCommand = String(index);
    button.textContent = slide.title || `轮播图 ${index + 1}`;
    button.addEventListener("click", () => {
      setAiSlide(index);
      startAiCarousel();
    });
    aiCommandList.append(button);
  });
}

function aiCommandButtons() {
  return [...document.querySelectorAll("[data-ai-command]")];
}

function setAiSlide(index) {
  if (!aiSlides.length) return;
  activeAiSlide = (index + aiSlides.length) % aiSlides.length;
  const slide = aiSlides[activeAiSlide];
  const images = [...aiMedia.querySelectorAll("img")];
  const imageSlideIndexes = aiSlides.map((item, slideIndex) => item.imageUrl ? slideIndex : -1).filter(index => index >= 0);
  images.forEach((image, imageIndex) => image.classList.toggle("is-active", imageSlideIndexes[imageIndex] === activeAiSlide));
  aiPrompts.forEach((prompt, promptIndex) => prompt.classList.toggle("is-active", promptIndex === activeAiSlide % aiPrompts.length));
  updateAiDots();
  if (aiKicker) aiKicker.textContent = slide.kicker;
  if (aiTitle) aiTitle.textContent = slide.title;
  if (aiDescription) aiDescription.textContent = slide.description;
  if (aiSuggestion) aiSuggestion.textContent = slide.suggestion;
  aiCommandButtons().forEach(button => button.classList.toggle("is-active", Number(button.dataset.aiCommand) === activeAiSlide));
}

function startAiCarousel() {
  stopAiCarousel();
  aiDots?.classList.remove("is-paused");
  if (aiSlides.length < 2) return;
  aiTimer = window.setInterval(() => setAiSlide(activeAiSlide + 1), 4200);
}

function stopAiCarousel() {
  aiDots?.classList.add("is-paused");
  if (!aiTimer) return;
  window.clearInterval(aiTimer);
  aiTimer = null;
}

function updateAiDots() {
  const dots = [...(aiDots?.children || [])];
  dots.forEach((dot, dotIndex) => {
    dot.classList.remove("is-active");
    if (dotIndex === activeAiSlide) {
      void dot.offsetWidth;
      dot.classList.add("is-active");
    }
  });
}
