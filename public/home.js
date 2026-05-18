const tabs = [...document.querySelectorAll("[data-extension-tab]")];
const cards = [...document.querySelectorAll("[data-extension-card]")];
const row = document.querySelector("[data-extension-row]");

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

let aiSlides = [];
let activeAiSlide = 0;
let aiTimer = null;

if (tabs.length && cards.length && row) {
  tabs.forEach(tab => {
    tab.addEventListener("click", () => focusExtension(tab.dataset.extensionTab));
  });
}

initAiCarousel();

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
