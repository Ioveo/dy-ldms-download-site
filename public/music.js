let tracks = [];
let activeTrack = null;

const grid = byId("musicGrid");
const search = byId("musicSearch");
const clear = byId("clearMusicSearch");
const player = byId("musicPlayer");
const audio = byId("playerAudio");
const playButton = byId("playerPlay");
const progress = byId("playerProgress");

loadMusic();

search.addEventListener("input", renderMusic);
clear.addEventListener("click", () => {
  search.value = "";
  renderMusic();
});
playButton.addEventListener("click", () => {
  if (!audio.src) {
    byId("playerArtist").textContent = "\u5148\u9009\u62e9\u4e00\u9996\u6b4c";
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
  playButton.textContent = "\u64ad\u653e";
  byId("playerArtist").textContent = activeTrack?.neteaseId
    ? "\u7f51\u6613\u4e91\u6682\u65f6\u4e0d\u53ef\u64ad\u653e\uff0c\u5efa\u8bae\u4e0a\u4f20\u97f3\u9891\u5230 R2"
    : "\u97f3\u9891\u5730\u5740\u6682\u65f6\u4e0d\u53ef\u64ad\u653e";
});
progress.addEventListener("input", () => {
  if (!audio.duration) return;
  audio.currentTime = (Number(progress.value) / 100) * audio.duration;
});

async function loadMusic() {
  const response = await fetch("/api/catalog", { cache: "no-store" });
  const catalog = response.ok ? await response.json() : { music: [] };
  tracks = catalog.music || [];
  renderNavigation(catalog.navigation || []);
  renderMusic();
}

function renderMusic() {
  const keyword = search.value.trim().toLowerCase();
  const visible = tracks.filter(track => {
    const haystack = [track.title, track.artist, track.album, track.neteaseId, ...(track.tags || [])].join(" ").toLowerCase();
    return !keyword || haystack.includes(keyword);
  });
  grid.replaceChildren();
  if (!visible.length) {
    grid.innerHTML = `<article class="music-empty"><h3>音乐准备中</h3><p>后台发布音乐后会显示在这里。</p></article>`;
    return;
  }
  for (const track of visible) {
    const card = document.createElement("article");
    card.className = "music-card";
    card.innerHTML = `
      <button class="music-card__cover" type="button">
        <img src="${escapeAttr(track.coverUrl || "/logo.png")}" alt="">
        <span>${track.featured ? "Featured" : "Play"}</span>
      </button>
      <div>
        <p>${escapeHtml(track.album || "Single")}</p>
        <h3>${escapeHtml(track.title)}</h3>
        <strong>${escapeHtml(track.artist)}</strong>
        <small>${(track.tags || []).map(escapeHtml).join(" / ") || (track.neteaseId ? `网易云 ID ${escapeHtml(track.neteaseId)}` : "R2 音频")}</small>
      </div>
    `;
    card.addEventListener("click", () => playTrack(track));
    grid.append(card);
  }
}

function playTrack(track) {
  const url = playableUrl(track);
  if (!url) return;
  activeTrack = track;
  byId("playerCover").src = track.coverUrl || "/logo.png";
  byId("playerTitle").textContent = track.title;
  byId("playerArtist").textContent = `${track.artist}${track.neteaseId && !track.audioUrl ? " · \u7f51\u6613\u4e91\u97f3\u4e50" : ""}`;
  audio.src = url;
  player.hidden = false;
  audio.play().catch(() => {
    byId("playerArtist").textContent = "\u6d4f\u89c8\u5668\u963b\u6b62\u4e86\u81ea\u52a8\u64ad\u653e\uff0c\u8bf7\u518d\u70b9\u4e00\u6b21\u64ad\u653e";
  });
}

function playableUrl(track) {
  if (track.audioUrl) return track.audioUrl;
  if (track.neteaseId) return `/api/music/netease?id=${encodeURIComponent(track.neteaseId)}`;
  return "";
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
