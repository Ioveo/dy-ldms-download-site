let tracks = [];
let activeTrack = null;
let activeTag = "all";

const grid = byId("musicGrid");
const search = byId("musicSearch");
const clear = byId("clearMusicSearch");
const player = byId("musicPlayer");
const audio = byId("playerAudio");
const playButton = byId("playerPlay");
const progress = byId("playerProgress");
const heroPlay = byId("heroPlay");

loadMusic();

search.addEventListener("input", renderMusic);
clear.addEventListener("click", () => {
  search.value = "";
  activeTag = "all";
  renderMusic();
});
heroPlay.addEventListener("click", () => {
  if (tracks[0]) playTrack(tracks[0]);
});
playButton.addEventListener("click", () => {
  if (!audio.src) {
    byId("playerArtist").textContent = "先选择一首歌";
    return;
  }
  if (audio.paused) audio.play();
  else audio.pause();
});
audio.addEventListener("play", () => playButton.textContent = "暂停");
audio.addEventListener("pause", () => playButton.textContent = "播放");
audio.addEventListener("timeupdate", () => {
  if (!audio.duration) return;
  progress.value = String((audio.currentTime / audio.duration) * 100);
});
audio.addEventListener("error", () => {
  playButton.textContent = "播放";
  byId("playerArtist").textContent = activeTrack?.neteaseId
    ? "网易云暂时不可播放，建议上传音频到 R2"
    : "音频地址暂时不可播放";
});
progress.addEventListener("input", () => {
  if (!audio.duration) return;
  audio.currentTime = (Number(progress.value) / 100) * audio.duration;
});

async function loadMusic() {
  const response = await fetch("/api/catalog", { cache: "no-store" });
  const catalog = response.ok ? await response.json() : { music: [] };
  tracks = (catalog.music || []).map(normalizeTrack);
  renderNavigation(catalog.navigation || []);
  renderOverview();
  renderMusic();
}

function renderOverview() {
  const featured = tracks.filter(track => track.featured);
  const tags = tagList();
  const hero = featured[0] || tracks[0];
  byId("statTracks").textContent = String(tracks.length);
  byId("statNew").textContent = String(Math.min(tracks.length, 8));
  byId("statFeatured").textContent = String(featured.length);
  byId("statTags").textContent = String(tags.length);

  if (hero) {
    byId("heroCover").src = hero.coverUrl || "/logo.png";
    byId("heroTitle").textContent = hero.title;
    byId("heroArtist").textContent = hero.artist;
  }

  renderNewReleases();
  renderCharts();
  renderTags(tags);
}

function renderNewReleases() {
  const latest = [...tracks].sort((a, b) => (b.createdAt || b.updatedAt || 0) - (a.createdAt || a.updatedAt || 0));
  const main = latest[0];
  const root = byId("newRelease");
  const list = byId("newReleaseList");
  if (!main) {
    root.innerHTML = emptyBlock("暂无上新", "后台发布音乐后，这里会显示最新曲目。");
    list.replaceChildren();
    return;
  }
  root.innerHTML = `
    <button type="button" class="new-release__cover">
      <img src="${escapeAttr(main.coverUrl || "/logo.png")}" alt="">
      <span>播放</span>
    </button>
    <div>
      <p class="section-kicker">Latest Drop</p>
      <h3>${escapeHtml(main.title)}</h3>
      <strong>${escapeHtml(main.artist)}</strong>
      <small>${escapeHtml(trackSource(main))} · ${formatDate(main.createdAt || main.updatedAt)}</small>
      <button type="button">立即试听</button>
    </div>
  `;
  root.querySelectorAll("button").forEach(button => button.addEventListener("click", () => playTrack(main)));
  list.replaceChildren(...latest.slice(1, 5).map((track, index) => compactTrack(track, index + 2)));
}

function renderCharts() {
  const ranked = [...tracks].sort((a, b) => {
    return (b.playCount || 0) - (a.playCount || 0)
      || Number(Boolean(b.featured)) - Number(Boolean(a.featured))
      || (b.updatedAt || 0) - (a.updatedAt || 0);
  }).slice(0, 8);
  const root = byId("chartList");
  if (!ranked.length) {
    root.innerHTML = emptyBlock("排行榜待生成", "播放和推荐数据积累后会自动更新。");
    return;
  }
  root.replaceChildren(...ranked.map((track, index) => chartRow(track, index + 1)));
}

function renderTags(tags) {
  const root = byId("tagStrip");
  const buttons = [{ label: "全部", value: "all" }, ...tags.map(tag => ({ label: tag, value: tag }))];
  root.replaceChildren(...buttons.map(item => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = item.label;
    button.className = item.value === activeTag ? "is-active" : "";
    button.addEventListener("click", () => {
      activeTag = item.value;
      renderMusic();
    });
    return button;
  }));
}

function renderMusic() {
  const keyword = search.value.trim().toLowerCase();
  const visible = tracks.filter(track => {
    const haystack = [track.title, track.artist, track.album, track.neteaseId, ...(track.tags || [])].join(" ").toLowerCase();
    const tagOk = activeTag === "all" || (track.tags || []).includes(activeTag);
    return tagOk && (!keyword || haystack.includes(keyword));
  });
  renderTags(tagList());
  grid.replaceChildren();
  if (!visible.length) {
    grid.innerHTML = emptyBlock("没有匹配歌曲", "换个关键词或清空标签筛选再试。");
    return;
  }
  grid.replaceChildren(...visible.map(trackCard));
}

function trackCard(track) {
  const card = document.createElement("article");
  card.className = "music-card";
  card.innerHTML = `
    <button class="music-card__cover" type="button">
      <img src="${escapeAttr(track.coverUrl || "/logo.png")}" alt="">
      <span>${track.featured ? "Featured" : "Play"}</span>
    </button>
    <div>
      <p>${escapeHtml(track.album || trackSource(track))}</p>
      <h3>${escapeHtml(track.title)}</h3>
      <strong>${escapeHtml(track.artist)}</strong>
      <small>${trackTags(track)}</small>
    </div>
  `;
  card.addEventListener("click", () => playTrack(track));
  return card;
}

function compactTrack(track, index) {
  const row = document.createElement("button");
  row.type = "button";
  row.className = "release-row";
  row.innerHTML = `<span>${String(index).padStart(2, "0")}</span><img src="${escapeAttr(track.coverUrl || "/logo.png")}" alt=""><strong>${escapeHtml(track.title)}</strong><small>${escapeHtml(track.artist)}</small>`;
  row.addEventListener("click", () => playTrack(track));
  return row;
}

function chartRow(track, rank) {
  const row = document.createElement("button");
  row.type = "button";
  row.className = "chart-row";
  row.innerHTML = `<span>${rank}</span><img src="${escapeAttr(track.coverUrl || "/logo.png")}" alt=""><strong>${escapeHtml(track.title)}</strong><small>${escapeHtml(track.artist)}</small><em>${track.featured ? "推荐" : trackSource(track)}</em>`;
  row.addEventListener("click", () => playTrack(track));
  return row;
}

function playTrack(track) {
  const url = playableUrl(track);
  if (!url) return;
  activeTrack = track;
  byId("playerCover").src = track.coverUrl || "/logo.png";
  byId("playerTitle").textContent = track.title;
  byId("playerArtist").textContent = `${track.artist}${track.neteaseId && !track.audioUrl ? " · 网易云音乐" : ""}`;
  audio.src = url;
  player.hidden = false;
  audio.play().catch(() => {
    byId("playerArtist").textContent = "浏览器阻止了自动播放，请再点一次播放";
  });
}

function playableUrl(track) {
  if (track.audioUrl) return track.audioUrl;
  if (track.neteaseId) return `/api/music/netease?id=${encodeURIComponent(track.neteaseId)}`;
  return "";
}

function normalizeTrack(track) {
  return {
    ...track,
    tags: Array.isArray(track.tags) ? track.tags : String(track.tags || "").split(/[,，\n]/).map(item => item.trim()).filter(Boolean),
    playCount: Number(track.playCount || 0),
    createdAt: Number(track.createdAt || 0),
    updatedAt: Number(track.updatedAt || 0)
  };
}

function tagList() {
  return Array.from(new Set(tracks.flatMap(track => track.tags || []))).slice(0, 12);
}

function trackTags(track) {
  const tags = (track.tags || []).slice(0, 3).map(escapeHtml).join(" / ");
  return tags || (track.neteaseId ? `网易云 ID ${escapeHtml(track.neteaseId)}` : "R2 音频");
}

function trackSource(track) {
  return track.audioUrl ? "R2 音频" : track.neteaseId ? "网易云音乐" : "在线音乐";
}

function formatDate(value) {
  if (!value) return "刚刚上新";
  return new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit" }).format(new Date(value));
}

function emptyBlock(title, body) {
  return `<article class="music-empty"><h3>${escapeHtml(title)}</h3><p>${escapeHtml(body)}</p></article>`;
}

function renderNavigation(items) {
  const nav = document.querySelector("[data-nav]");
  if (!nav || !items.length) return;
  nav.innerHTML = items.filter(item => item.status !== "disabled").map(item => `<a href="${escapeAttr(item.href)}"${item.external ? ` target="_blank" rel="noopener"` : ""}>${escapeHtml(item.label)}</a>`).join("");
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
