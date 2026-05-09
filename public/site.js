const PRODUCT_FALLBACKS = [
  {
    match: /data|center|数据|datacenter/i,
    badge: "数据管理",
    title: "数据中心版",
    description: "直播数据录入、复盘、报表、主播档案和结算管理。",
    features: ["直播数据录入和 OCR 辅助识别", "日报、月报、复盘和结算管理", "本地数据备份与导入导出"],
    className: "product-card--data",
    image: "/datacenter-preview.jpg",
    alt: "数据中心版软件截图"
  },
  {
    match: /assistant|辅助|tool|live/i,
    badge: "直播辅助",
    title: "天才猫DY辅助工具",
    description: "独立轻量工具，适合现场运营和重复操作自动化。",
    features: ["自动讲解循环与讲解自检", "三条快捷回复和自动发送", "鼠标键盘宏录制与回放"],
    className: "product-card--assistant",
    mock: true
  }
];

loadRelease();
initShowcase();

async function loadRelease() {
  try {
    const response = await fetch("/api/releases", { cache: "no-store" });
    if (!response.ok) {
      throw new Error("manifest request failed");
    }

    const manifest = await response.json();
    document.title = `${manifest.product || "天才猫软件中心"} - 官方下载`;
    renderSoftwareGrid(manifest);
  } catch {
    renderSoftwareGrid({ releases: [] });
  }
}

function renderSoftwareGrid(manifest) {
  const grid = byId("softwareGrid");
  const releases = Array.isArray(manifest.releases) ? manifest.releases : [];
  const products = buildProducts(releases);
  grid.replaceChildren();

  for (const product of products) {
    const card = document.createElement("article");
    card.className = `product-card ${product.className}`;

    const media = document.createElement("div");
    media.className = product.mock ? "product-card__media product-card__media--mock" : "product-card__media";
    if (product.mock) {
      const panel = document.createElement("div");
      panel.className = "assistant-panel";
      panel.innerHTML = "<span>LIVE ASSISTANT</span><strong>天才猫DY辅助工具</strong><p>自动讲解 · 快速回复 · 宏录制</p>";
      media.append(panel);
    } else {
      const image = document.createElement("img");
      image.src = product.image;
      image.alt = product.alt;
      image.loading = "lazy";
      media.append(image);
    }

    const badge = document.createElement("span");
    badge.className = "product-card__badge";
    badge.textContent = product.badge;

    const title = document.createElement("h3");
    title.textContent = product.title;

    const desc = document.createElement("p");
    desc.textContent = product.release?.description || product.description;

    const list = document.createElement("ul");
    for (const feature of product.release?.notes?.length ? product.release.notes : product.features) {
      const item = document.createElement("li");
      item.textContent = feature;
      list.append(item);
    }

    const meta = document.createElement("small");
    meta.textContent = product.release
      ? [product.release.version, product.release.size, product.release.sha256 ? `SHA256 ${product.release.sha256.slice(0, 12)}...` : ""].filter(Boolean).join(" · ")
      : "安装包待上传";

    const link = document.createElement("a");
    link.className = product.release ? "button button--primary" : "button button--disabled";
    link.href = product.release ? downloadUrl(product.release) : "#download";
    link.textContent = product.release ? "点击下载" : "待发布";

    card.append(media, badge, title, desc, list, meta, link);
    grid.append(card);
  }
}

function buildProducts(releases) {
  return PRODUCT_FALLBACKS.map(fallback => {
    const release = releases.find(item => fallback.match.test([item.id, item.name, item.category, item.fileName, item.key].filter(Boolean).join(" ")));
    return { ...fallback, release };
  });
}

function downloadUrl(release) {
  return `/download/${encodeURIComponent(release.id || "latest")}`;
}

function byId(id) {
  return document.getElementById(id);
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
