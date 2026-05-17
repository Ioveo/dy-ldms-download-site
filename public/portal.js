loadPortal();

async function loadPortal() {
  try {
    const response = await fetch("/api/catalog", { cache: "no-store" });
    const catalog = response.ok ? await response.json() : {};
    renderNavigation(catalog.navigation || []);
    renderSoftware(catalog.software || []);
    renderMusic(catalog.music || []);
    renderArticles(catalog.articles || []);
  } catch {
    renderSoftware([]);
    renderMusic([]);
    renderArticles([]);
  }
}

function renderSoftware(items) {
  const root = byId("portalSoftware");
  if (!root) return;
  const software = items.filter(item => item.status !== "disabled").slice(0, 4);
  if (!software.length) {
    root.innerHTML = emptyCard("terminal", "软件准备中", "后台添加软件后会自动展示。");
    return;
  }
  root.replaceChildren(...software.map(item => {
    const release = latestRelease(item);
    const card = document.createElement("article");
    card.className = "portal-software-card";
    card.innerHTML = `
      <div class="portal-card-icon"><span class="material-symbols-outlined">${iconForSoftware(item)}</span></div>
      <h3>${escapeHtml(item.name)}</h3>
      <p>${escapeHtml(item.description || "官方软件版本，支持下载安装到本地使用。")}</p>
      <small>${escapeHtml(release?.version || "等待发布")}</small>
      <a href="${release ? `/download/${encodeURIComponent(release.id)}` : "/download.html"}">下载</a>
    `;
    return card;
  }));
}

function renderMusic(items) {
  const featured = items.filter(item => item.status === "published");
  const main = featured.find(item => item.featured) || featured[0];
  const lead = byId("portalFeaturedMusic");
  if (lead && main) {
    lead.innerHTML = `
      <button type="button"><span class="material-symbols-outlined">play_arrow</span></button>
      <img src="${escapeAttr(main.coverUrl || "/logo.png")}" alt="">
      <div>
        <small>今日主推</small>
        <strong>${escapeHtml(main.title)}</strong>
        <span>${escapeHtml(main.artist || "天才猫音乐")}</span>
      </div>
    `;
    lead.addEventListener("click", () => location.href = "/music.html");
  }

  const root = byId("portalMusic");
  if (!root) return;
  const list = featured.slice(0, 3);
  if (!list.length) {
    root.innerHTML = emptyCard("graphic_eq", "音乐准备中", "后台发布歌曲后会展示上新和排行。");
    return;
  }
  root.replaceChildren(...list.map((item, index) => {
    const row = document.createElement("a");
    row.href = "/music.html";
    row.className = "portal-music-row";
    row.innerHTML = `<b>${String(index + 1).padStart(2, "0")}</b><span><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.artist || "未知歌手")}</small></span><em>${item.neteaseId ? "网易云" : "R2"}</em>`;
    return row;
  }));
}

function renderArticles(items) {
  const root = byId("portalArticles");
  if (!root) return;
  const articles = items
    .filter(item => item.status === "published")
    .sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)) || Number(b.createdAt || 0) - Number(a.createdAt || 0))
    .slice(0, 3);
  if (!articles.length) {
    root.innerHTML = emptyCard("article", "文章准备中", "后台发布文章后会自动展示。");
    return;
  }
  root.replaceChildren(...articles.map(item => {
    const card = document.createElement("article");
    card.className = "portal-article-card";
    card.innerHTML = `
      ${item.coverUrl ? `<img src="${escapeAttr(item.coverUrl)}" alt="" loading="lazy">` : ""}
      <div>
        <span>${escapeHtml(item.category || "Article")}</span>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.summary || "查看这篇教程和更新说明。")}</p>
        <a href="/article.html?slug=${encodeURIComponent(item.slug)}">阅读文章</a>
      </div>
    `;
    return card;
  }));
}

function renderNavigation(items) {
  const nav = document.querySelector("[data-nav]");
  if (!nav || !items.length) return;
  nav.replaceChildren();
  for (const item of items.filter(entry => entry.status !== "disabled")) {
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

function latestRelease(item) {
  const releases = (item.releases || []).filter(release => release.status === "published");
  return releases.find(release => release.isLatest) || releases[0] || null;
}

function iconForSoftware(item) {
  const text = [item.name, item.slug, item.description].join(" ").toLowerCase();
  if (/cloud|sync|云/.test(text)) return "cloud_sync";
  if (/secure|安全|授权/.test(text)) return "security";
  if (/ai|智能/.test(text)) return "psychology";
  return "terminal";
}

function emptyCard(icon, title, body) {
  return `<article class="portal-empty"><span class="material-symbols-outlined">${icon}</span><h3>${escapeHtml(title)}</h3><p>${escapeHtml(body)}</p></article>`;
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
