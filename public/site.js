const PRODUCT_FALLBACKS = [
  {
    match: /data|center|数据|datacenter/i,
    badge: "数据管理",
    title: "数据中心版",
    description: "适合需要沉淀直播场次、主播档案、账号数据和复盘报表的团队。",
    features: ["直播数据录入和 OCR 辅助识别", "日报、月报、复盘和结算管理", "本地数据备份与导入导出"],
    className: "product-card--data",
    image: "/app-preview.png",
    alt: "数据中心版软件截图"
  },
  {
    match: /assistant|辅助|tool|live/i,
    badge: "直播辅助",
    title: "天才猫DY辅助工具",
    description: "适合现场运营使用，轻量保留自动讲解、快速回复和宏录制。",
    features: ["自动讲解循环与讲解自检", "三条快捷回复和自动发送", "鼠标键盘宏录制与回放"],
    className: "product-card--assistant",
    image: "/assistant-preview.jpg",
    alt: "天才猫DY辅助工具软件截图"
  }
];

loadRelease();

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

    const badge = document.createElement("span");
    badge.className = "product-card__badge";
    badge.textContent = product.badge;

    const media = document.createElement("div");
    media.className = "product-card__media";
    const image = document.createElement("img");
    image.src = product.image;
    image.alt = product.alt;
    image.loading = "lazy";
    media.append(image);

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
    link.href = product.release ? downloadUrl(product.release) : "#products";
    link.textContent = product.release ? "立即下载" : "待发布";

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
