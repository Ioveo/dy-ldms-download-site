let token = sessionStorage.getItem("downloadAdminToken") || "";
let catalog = null;
let articleSoftwareCategory = "all";
let articleSoftwareSelection = new Set();
const ARTICLE_DRAFT_KEY = "downloadAdminArticleDraft";
const ADMIN_MODULES = {
  software: {
    title: "\u8f6f\u4ef6\u7ba1\u7406",
    description: "\u7ef4\u62a4\u8f6f\u4ef6\u8d44\u6599\u3001\u5206\u7c7b\u548c\u7248\u672c\u53d1\u5e03\u3002",
    items: [
      { panel: "softwarePanel", view: "softwareEdit", label: "\u6dfb\u52a0\u8f6f\u4ef6", action: "\u8d44\u6599\u7f16\u8f91" },
      { panel: "softwarePanel", view: "softwareList", label: "\u8f6f\u4ef6\u5217\u8868", action: "\u5217\u8868\u7ba1\u7406" },
      { panel: "categoryPanel", label: "\u5206\u7c7b\u7ba1\u7406", action: "\u5206\u7c7b\u7ef4\u62a4" },
      { panel: "releasePanel", view: "releaseUpload", label: "\u4e0a\u4f20\u7248\u672c", action: "\u53d1\u5e03\u5b89\u88c5\u5305" },
      { panel: "releasePanel", view: "releaseList", label: "\u7248\u672c\u5217\u8868", action: "\u6587\u4ef6\u7ba1\u7406" }
    ]
  },
  music: {
    title: "\u97f3\u4e50\u7ba1\u7406",
    description: "\u7ba1\u7406\u97f3\u4e50\u9891\u9053\u3001\u66f2\u5e93\u3001\u5c01\u9762\u548c\u8bd5\u542c\u3002",
    items: [
      { panel: "musicPanel", view: "musicEdit", label: "\u6dfb\u52a0\u97f3\u4e50", action: "\u7f16\u8f91\u66f2\u76ee" },
      { panel: "musicPanel", view: "musicList", label: "\u97f3\u4e50\u5217\u8868", action: "\u5217\u8868\u7ba1\u7406" },
      { panel: "mediaPanel", label: "\u5a92\u4f53\u5e93", action: "\u97f3\u9891/\u56fe\u7247" }
    ]
  },
  gallery: {
    title: "画廊管理",
    description: "管理前台画廊图片、R2 素材和展示状态。",
    items: [
      { panel: "galleryPanel", view: "galleryEdit", label: "添加图片", action: "图片编辑" },
      { panel: "galleryPanel", view: "galleryList", label: "画廊列表", action: "列表管理" },
      { panel: "assetPanel", view: "assetList", label: "资源列表", action: "R2 图片" }
    ]
  },
  article: {
    title: "\u6587\u7ae0\u7ba1\u7406",
    description: "\u53d1\u8868\u6587\u7ae0\u3001\u7ba1\u7406\u5c01\u9762\u548c\u5173\u8054\u8f6f\u4ef6\u3002",
    items: [
      { panel: "articlePanel", view: "articleEdit", label: "\u53d1\u8868\u6587\u7ae0", action: "\u65b0\u5efa/\u7f16\u8f91" },
      { panel: "articlePanel", view: "articleList", label: "\u6587\u7ae0\u5217\u8868", action: "\u5217\u8868\u7ba1\u7406" },
      { panel: "mediaPanel", label: "\u5a92\u4f53\u5e93", action: "\u63d2\u5165\u7d20\u6750" }
    ]
  },
  asset: {
    title: "\u8d44\u6e90\u7ba1\u7406",
    description: "\u7ba1\u7406 R2 \u4e2d\u7684\u56fe\u7247\u3001\u97f3\u9891\u3001\u8f6f\u4ef6\u5305\u548c\u7ad9\u70b9\u8d44\u6e90\u3002",
    items: [
      { panel: "assetPanel", view: "assetUpload", label: "\u8d44\u6e90\u4e0a\u4f20", action: "\u4e0a\u4f20\u6587\u4ef6" },
      { panel: "assetPanel", view: "assetList", label: "\u8d44\u6e90\u5217\u8868", action: "\u626b\u63cf R2" },
      { panel: "mediaPanel", label: "\u5a92\u4f53\u5e93", action: "\u6587\u7ae0\u5a92\u4f53" }
    ]
  },
  site: {
    title: "\u7ad9\u70b9\u8bbe\u7f6e",
    description: "\u914d\u7f6e\u524d\u53f0\u5bfc\u822a\u548c\u5185\u5bb9\u5165\u53e3\u3002",
    items: [
      { panel: "navigationPanel", label: "\u5bfc\u822a", action: "\u83dc\u5355\u914d\u7f6e" },
      { panel: "healthPanel", label: "\u7cfb\u7edf\u72b6\u6001", action: "\u90e8\u7f72\u68c0\u67e5" }
    ]
  },
  system: {
    title: "\u7cfb\u7edf\u914d\u7f6e",
    description: "\u68c0\u67e5 R2\u3001D1\u3001\u5b58\u50a8\u6388\u6743\u548c\u7cfb\u7edf\u5065\u5eb7\u3002",
    items: [
      { panel: "storagePanel", label: "\u5b58\u50a8\u6388\u6743", action: "R2 \u8d26\u53f7" },
      { panel: "healthPanel", label: "\u7cfb\u7edf\u72b6\u6001", action: "\u5065\u5eb7\u68c0\u67e5" }
    ]
  }
};
const DIRECT_UPLOAD_LIMIT = 95 * 1024 * 1024;
const CHUNK_SIZE = 10 * 1024 * 1024;
const CHUNK_UPLOAD_THRESHOLD = 10 * 1024 * 1024;
const MAX_CHUNKED_SIZE = 5 * 1024 * 1024 * 1024;
let articleDraftTimer = null;

const loginView = byId("loginView");
const appView = byId("appView");

byId("loginButton").addEventListener("click", login);
byId("adminPassword").addEventListener("keydown", event => {
  if (event.key === "Enter") login();
});
byId("logoutButton").addEventListener("click", logout);
byId("softwareForm").addEventListener("submit", saveSoftware);
byId("categoryForm").addEventListener("submit", saveCategory);
byId("storageForm").addEventListener("submit", saveStorage);
byId("navigationForm").addEventListener("submit", saveNavigation);
byId("articleForm").addEventListener("submit", saveArticle);
byId("musicForm").addEventListener("submit", saveMusic);
byId("galleryForm").addEventListener("submit", saveGallery);
byId("releaseForm").addEventListener("submit", uploadRelease);
byId("releaseRegisterForm").addEventListener("submit", registerUploadedRelease);
byId("uploadSoftwareCover").addEventListener("click", uploadSoftwareCover);
byId("useSoftwareCoverAsset").addEventListener("click", useSoftwareCoverAsset);
byId("uploadMusicAudio").addEventListener("click", uploadMusicAudio);
byId("uploadMusicCover").addEventListener("click", uploadMusicCover);
byId("useMusicCoverAsset").addEventListener("click", useMusicCoverAsset);
byId("previewMusic").addEventListener("click", previewMusicFromForm);
byId("loadGalleryAssets").addEventListener("click", loadGalleryAssets);
byId("useGalleryAsset").addEventListener("click", useGalleryAsset);
byId("uploadGalleryImage").addEventListener("click", uploadGalleryImage);
byId("previewGalleryImage").addEventListener("click", previewGalleryImage);
byId("galleryStorage").addEventListener("change", loadGalleryAssets);
byId("resetSoftware").addEventListener("click", resetSoftwareForm);
byId("resetMusic").addEventListener("click", resetMusicForm);
byId("resetGallery").addEventListener("click", resetGalleryForm);
byId("resetCategory").addEventListener("click", resetCategoryForm);
byId("resetStorage").addEventListener("click", resetStorageForm);
byId("resetNavigation").addEventListener("click", resetNavigationForm);
byId("resetArticle").addEventListener("click", resetArticleForm);
byId("restoreArticleDraft").addEventListener("click", restoreArticleDraft);
byId("clearArticleDraft").addEventListener("click", clearArticleDraft);
byId("testStorage").addEventListener("click", testStorage);
byId("runHealthCheck").addEventListener("click", loadHealth);
byId("loadMediaAll").addEventListener("click", () => loadMedia("all"));
byId("loadMediaImage").addEventListener("click", () => loadMedia("image"));
byId("loadMediaAudio").addEventListener("click", () => loadMedia("audio"));
byId("refreshAssets").addEventListener("click", loadAssets);
byId("assetUploadForm").addEventListener("submit", uploadAsset);
byId("assetKindFilter").addEventListener("change", loadAssets);
byId("assetStatusFilter").addEventListener("change", loadAssets);
byId("assetSearch").addEventListener("input", debounce(loadAssets, 250));
byId("insertArticleH2").addEventListener("click", () => insertArticleSnippet("\n## 小标题\n\n这里填写正文。\n"));
byId("insertArticleList").addEventListener("click", () => insertArticleSnippet("\n- 要点一\n- 要点二\n- 要点三\n"));
byId("insertArticleCode").addEventListener("click", () => insertArticleSnippet("\n```text\n这里粘贴代码或日志\n```\n"));
byId("uploadArticleImage").addEventListener("click", () => uploadArticleImage("cover"));
byId("insertArticleImage").addEventListener("click", () => uploadArticleImage("content"));
byId("insertArticleAudio").addEventListener("click", () => uploadArticleImage("audio"));
byId("insertArticleTable").addEventListener("click", insertArticleTable);
byId("insertArticleQuote").addEventListener("click", insertArticleQuote);
byId("articleTitle").addEventListener("input", updateArticleEditorMeta);
byId("articleSummary").addEventListener("input", updateArticleEditorMeta);
byId("articleContent").addEventListener("input", updateArticleEditorMeta);
byId("articleCover").addEventListener("input", updateArticleEditorMeta);
byId("articleForm").addEventListener("input", scheduleArticleDraftSave);
byId("articleSoftwareCategory").addEventListener("change", event => {
  articleSoftwareCategory = event.target.value;
  renderArticleOptions();
});
byId("clearArticleSoftware").addEventListener("click", () => {
  articleSoftwareSelection.clear();
  renderArticleOptions();
});

document.querySelectorAll(".sidebar nav button").forEach(button => {
  button.addEventListener("click", () => showPanel(button.dataset.panel));
});

if (token) loadCatalog();
updateArticleDraftStatus();

async function login() {
  const password = byId("adminPassword").value.trim();
  if (!password) return toast("请输入管理员密码", true);
  const result = await loginApi(password);
  if (!result.success) {
    token = "";
    return toast(result.msg || "登录失败", true);
  }
  token = result.token || "";
  sessionStorage.setItem("downloadAdminToken", token);
  await loadCatalog();
  toast("登录成功");
}

function logout() {
  sessionStorage.removeItem("downloadAdminToken");
  location.reload();
}

function showApp() {
  loginView.hidden = true;
  appView.hidden = false;
  document.body.classList.add("is-admin-ready");
  document.body.classList.add("admin-overview");
  document.body.dataset.adminView = "softwareEdit";
  renderModuleNav("software", "softwarePanel");
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
}

async function loadCatalog() {
  const result = await api("/api/admin/catalog");
  if (result.success) {
    showApp();
    render(result.catalog);
  } else {
    token = "";
    sessionStorage.removeItem("downloadAdminToken");
    hideApp();
    toast(result.msg || "读取失败", true);
  }
}

function hideApp() {
  loginView.hidden = false;
  appView.hidden = true;
  document.body.classList.remove("is-admin-ready");
}

function render(nextCatalog) {
  catalog = nextCatalog;
  renderStats();
  renderCategoryOptions();
  renderSoftwareRows();
  renderCategoryRows();
  renderStorageRows();
  renderNavigationRows();
  renderArticleOptions();
  renderArticleRows();
  renderMusicRows();
  renderGalleryRows();
  renderReleaseRows();
}

function renderStats() {
  const softwareCount = catalog.software.length;
  const releaseCount = catalog.software.reduce((sum, item) => sum + item.releases.length, 0);
  const downloadCount = catalog.software.reduce((sum, item) => sum + item.releases.reduce((inner, release) => inner + (release.downloadCount || 0), 0), 0);
  byId("stats").innerHTML = [
    ["软件数量", softwareCount],
    ["版本数量", releaseCount],
    ["总下载", downloadCount],
    ["分类数量", catalog.categories.length]
  ].map(([label, value]) => `<article class="stat"><span>${escapeHtml(label)}</span><strong>${value}</strong></article>`).join("");
}

function renderCategoryOptions() {
  const options = catalog.categories.map(category => `<option value="${escapeAttr(category.id)}">${escapeHtml(category.name)}</option>`).join("");
  byId("softwareCategory").innerHTML = options;
  byId("releaseSoftware").innerHTML = catalog.software.map(item => `<option value="${escapeAttr(item.id)}">${escapeHtml(item.name)}</option>`).join("");
  byId("registerSoftware").innerHTML = byId("releaseSoftware").innerHTML;
  byId("releaseStorage").innerHTML = `<option value="default">默认 R2：dy-ldms-downloads</option>${(catalog.storageAccounts || []).filter(item => item.status !== "disabled").map(item => `<option value="${escapeAttr(item.id)}">${escapeHtml(item.name)} / ${escapeHtml(item.bucket)}</option>`).join("")}`;
  const galleryStorage = byId("galleryStorage");
  if (galleryStorage) galleryStorage.innerHTML = `<option value="default">默认 R2</option><option value="cloudflare-images">Cloudflare Images 图像托管</option>${(catalog.storageAccounts || []).filter(item => item.status !== "disabled").map(item => `<option value="${escapeAttr(item.id)}">${escapeHtml(item.name)} / ${escapeHtml(item.bucket)}</option>`).join("")}`;
  loadSoftwareCoverAssets();
  loadMusicCoverAssets();
  loadGalleryAssets();
}

function renderArticleOptions() {
  const root = byId("articleSoftware");
  const categorySelect = byId("articleSoftwareCategory");
  if (!root || !categorySelect) return;
  const existingIds = new Set((catalog.software || []).map(item => item.id));
  articleSoftwareSelection = new Set(Array.from(articleSoftwareSelection).filter(id => existingIds.has(id)));

  const categories = [{ id: "all", name: "全部分类", count: catalog.software.length }, ...(catalog.categories || []).map(category => ({
    ...category,
    count: (catalog.software || []).filter(item => item.categoryId === category.id).length
  }))];
  if (!categories.some(category => category.id === articleSoftwareCategory)) articleSoftwareCategory = "all";
  categorySelect.innerHTML = categories.map(category => `<option value="${escapeAttr(category.id)}">${escapeHtml(category.name)}（${category.count || 0}）</option>`).join("");
  categorySelect.value = articleSoftwareCategory;

  const software = (catalog.software || []).filter(item => articleSoftwareCategory === "all" || item.categoryId === articleSoftwareCategory);
  if (!catalog.software.length) {
    root.innerHTML = `<p class="muted">还没有上传软件，先到“软件管理”添加软件。文章可以不关联软件直接保存。</p>`;
    updateArticleSoftwareHint();
    return;
  }
  if (!software.length) {
    root.innerHTML = `<p class="muted">当前分类没有软件，可以切换分类或不关联软件。</p>`;
    updateArticleSoftwareHint();
    return;
  }
  root.innerHTML = software.map(item => {
    const category = catalog.categories.find(entry => entry.id === item.categoryId);
    const checked = articleSoftwareSelection.has(item.id) ? "checked" : "";
    return `<label class="software-choice"><input type="checkbox" value="${escapeAttr(item.id)}" ${checked}> <span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(category?.name || "未分类")}${item.status === "disabled" ? " · 已下架" : ""}</small></span></label>`;
  }).join("");
  Array.from(root.querySelectorAll("input[type='checkbox']")).forEach(input => {
    input.addEventListener("change", () => {
      if (input.checked) articleSoftwareSelection.add(input.value);
      else articleSoftwareSelection.delete(input.value);
      updateArticleSoftwareHint();
    });
  });
  updateArticleSoftwareHint();
}

function renderSoftwareRows() {
  const rows = byId("softwareRows");
  rows.innerHTML = "";
  for (const item of catalog.software) {
    const category = catalog.categories.find(entry => entry.id === item.categoryId);
    const latest = item.releases.find(release => release.isLatest) || item.releases[0];
    const tr = document.createElement("tr");
    tr.innerHTML = `<td><strong>${escapeHtml(item.name)}</strong><br><small>${escapeHtml(item.slug)}</small></td><td>${escapeHtml(category?.name || "-")}</td><td>${escapeHtml(latest?.version || "-")}</td><td class="status-${item.status === "disabled" ? "disabled" : "active"}">${item.status === "disabled" ? "下架" : "上架"}</td><td class="row-actions"></td>`;
    const edit = actionButton("编辑", () => fillSoftwareForm(item));
    const remove = actionButton("删除", () => deleteSoftware(item.id), "danger");
    tr.lastElementChild.append(edit, remove);
    rows.append(tr);
  }
}

function renderCategoryRows() {
  const rows = byId("categoryRows");
  rows.innerHTML = "";
  for (const item of catalog.categories) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${escapeHtml(item.name)}</td><td class="code">${escapeHtml(item.slug)}</td><td>${item.sortOrder}</td><td class="status-${item.status === "disabled" ? "disabled" : "active"}">${item.status === "disabled" ? "隐藏" : "启用"}</td><td class="row-actions"></td>`;
    const edit = actionButton("编辑", () => fillCategoryForm(item));
    const remove = actionButton("删除", () => deleteCategory(item.id), "danger");
    tr.lastElementChild.append(edit, remove);
    rows.append(tr);
  }
}

function renderMusicRows() {
  const rows = byId("musicRows");
  if (!rows) return;
  rows.innerHTML = "";
  for (const item of catalog.music || []) {
    const tr = document.createElement("tr");
    const source = item.audioUrl ? "R2/链接" : item.neteaseId ? `网易云 ${item.neteaseId}` : "-";
    tr.innerHTML = `<td><strong>${escapeHtml(item.title)}</strong><br><small>${escapeHtml(item.artist)}${item.album ? ` · ${escapeHtml(item.album)}` : ""}</small></td><td class="code">${escapeHtml(source)}</td><td>${item.coverUrl ? `<img class="thumb" src="${escapeAttr(item.coverUrl)}" alt="">` : "-"}</td><td class="status-${item.status === "published" ? "active" : "disabled"}">${item.status === "published" ? "已发布" : item.status === "disabled" ? "隐藏" : "草稿"}</td><td class="row-actions"></td>`;
    tr.lastElementChild.append(
      actionButton("试听", () => previewMusic(item)),
      actionButton("编辑", () => fillMusicForm(item)),
      actionButton("删除", () => deleteMusic(item.id), "danger")
    );
    rows.append(tr);
  }
}

function renderGalleryRows() {
  const rows = byId("galleryRows");
  if (!rows) return;
  rows.innerHTML = "";
  for (const item of catalog.gallery || []) {
    const tr = document.createElement("tr");
    const source = item.source === "network" ? "网络图片" : item.storageId ? item.storageId : "-";
    tr.innerHTML = `<td>${item.imageUrl ? `<img class="thumb" src="${escapeAttr(item.thumbUrl || item.imageUrl)}" alt="">` : "-"} <strong>${escapeHtml(item.title)}</strong><br><small>${escapeHtml(item.description || "")}</small></td><td class="code">${escapeHtml(source)}<br><small>${escapeHtml(item.assetKey || item.imageUrl)}</small></td><td>${escapeHtml((item.tags || []).join(", "))}</td><td class="status-${item.status === "published" ? "active" : item.status === "draft" ? "draft" : "disabled"}">${item.status === "published" ? "已发布" : item.status === "draft" ? "草稿" : "隐藏"}</td><td class="row-actions"></td>`;
    tr.lastElementChild.append(
      actionButton("预览", () => window.open(item.imageUrl, "_blank")),
      actionButton("编辑", () => fillGalleryForm(item)),
      actionButton("删除", () => deleteGallery(item.id), "danger")
    );
    rows.append(tr);
  }
}

function renderStorageRows() {
  const rows = byId("storageRows");
  rows.innerHTML = "";
  for (const item of catalog.storageAccounts || []) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td><strong>${escapeHtml(item.name)}</strong><br><small>${escapeHtml(item.provider)}</small></td><td class="code">${escapeHtml(item.accountId)}</td><td>${escapeHtml(item.bucket)}</td><td>${item.hasSecret ? "已保存" : "未保存"}</td><td class="status-${item.status === "disabled" ? "disabled" : "active"}">${item.status === "disabled" ? "停用" : "启用"}</td><td class="row-actions"></td>`;
    const edit = actionButton("编辑", () => fillStorageForm(item));
    const remove = actionButton("删除", () => deleteStorage(item.id), "danger");
    tr.lastElementChild.append(edit, remove);
    rows.append(tr);
  }
}

function renderNavigationRows() {
  const rows = byId("navigationRows");
  rows.innerHTML = "";
  for (const item of catalog.navigation || []) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${escapeHtml(item.label)}</td><td class="code">${escapeHtml(item.href)}</td><td>${item.sortOrder}</td><td>${item.external ? "新窗口" : "当前窗口"}</td><td class="status-${item.status === "disabled" ? "disabled" : "active"}">${item.status === "disabled" ? "隐藏" : "显示"}</td><td class="row-actions"></td>`;
    const edit = actionButton("编辑", () => fillNavigationForm(item));
    const remove = actionButton("删除", () => deleteNavigation(item.id), "danger");
    tr.lastElementChild.append(edit, remove);
    rows.append(tr);
  }
}

function renderArticleRows() {
  const rows = byId("articleRows");
  const articles = catalog.articles || [];
  byId("articleCount").textContent = `${articles.length} 篇`;
  rows.replaceChildren();
  if (!articles.length) {
    rows.innerHTML = `<article class="article-admin-empty"><h4>还没有文章</h4><p>在左侧写一篇产品介绍、使用教程或更新说明。</p></article>`;
    return;
  }
  for (const item of articles) {
    const related = (item.softwareIds || []).map(id => catalog.software.find(software => software.id === id)?.name).filter(Boolean).join("、") || "-";
    const card = document.createElement("article");
    card.className = `article-admin-card ${item.id === byId("articleId").value ? "is-editing" : ""}`;
    card.innerHTML = `${item.coverUrl ? `<img src="${escapeAttr(item.coverUrl)}" alt="">` : `<div class="article-admin-card__placeholder">Article</div>`}<div class="article-admin-card__body"><div class="article-admin-card__meta"><span class="status-${articleStatusClass(item.status)}">${articleStatusLabel(item.status)}</span><small>${formatDateTime(item.updatedAt)}</small></div><h4>${escapeHtml(item.title)}</h4><p>${escapeHtml(item.summary || "暂无摘要")}</p><small>${escapeHtml(item.slug)} · ${escapeHtml(related)}</small><div class="row-actions"></div></div>`;
    const edit = actionButton("编辑", () => fillArticleForm(item));
    const view = actionButton("预览", () => window.open(`/article.html?slug=${encodeURIComponent(item.slug)}`, "_blank"));
    const remove = actionButton("删除", () => deleteArticle(item.id), "danger");
    card.querySelector(".row-actions").append(edit, view, remove);
    rows.append(card);
  }
}

function renderReleaseRows() {
  const rows = byId("releaseRows");
  rows.innerHTML = "";
  for (const item of catalog.software) {
    for (const release of item.releases) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${escapeHtml(item.name)}</td><td>${escapeHtml(release.version)}<br><small class="status-${release.status === "disabled" ? "disabled" : "active"}">${release.status === "disabled" ? "已隐藏" : "已发布"}</small></td><td class="code">${escapeHtml(release.fileName || "-")}<br><small>${escapeHtml(release.storageId || "default")}</small></td><td>${escapeHtml(release.size || "-")}</td><td>${release.isLatest ? "是" : "否"}</td><td>${release.downloadCount || 0}</td><td class="row-actions"></td>`;
      const link = `/download/${encodeURIComponent(release.id)}`;
      const replaceInput = document.createElement("input");
      replaceInput.type = "file";
      replaceInput.accept = ".zip,.7z,.exe,.msi";
      replaceInput.hidden = true;
      replaceInput.addEventListener("change", () => replaceReleaseFile(release.id, replaceInput));
      tr.lastElementChild.append(
        actionButton("设最新", () => updateRelease(release.id, "latest")),
        actionButton(release.status === "disabled" ? "恢复" : "隐藏", () => updateRelease(release.id, "toggle")),
        actionButton("替换文件", () => replaceInput.click()),
        actionButton("复制链接", () => copyText(link)),
        actionButton("删除", () => deleteRelease(release.id), "danger"),
        replaceInput
      );
      rows.append(tr);
    }
  }
}

async function loadHealth() {
  const root = byId("healthRows");
  root.innerHTML = `<article class="admin-info-card"><h4>正在检测...</h4><p>请稍候</p></article>`;
  const result = await api("/api/admin/health");
  if (!result.success) {
    root.innerHTML = `<article class="admin-info-card admin-info-card--bad"><h4>检测失败</h4><p>${escapeHtml(result.msg || "未知错误")}</p></article>`;
    return;
  }
  const health = result.health;
  root.innerHTML = `<article class="admin-info-card"><h4>${escapeHtml(health.product)}</h4><p>${escapeHtml(health.mode)} · ${formatDateTime(health.checkedAt)} · ${health.elapsedMs}ms</p></article>${health.checks.map(check => `<article class="admin-info-card ${check.ok ? "" : "admin-info-card--bad"}"><h4>${check.ok ? "正常" : "异常"} · ${escapeHtml(check.name)}</h4><p>${escapeHtml(check.detail)}</p></article>`).join("")}`;
}

async function loadMedia(type = "all") {
  const root = byId("mediaRows");
  root.innerHTML = `<article class="admin-info-card"><h4>正在读取媒体...</h4></article>`;
  const result = await api("/api/admin/media/list", { type });
  if (!result.success) {
    root.innerHTML = `<article class="admin-info-card admin-info-card--bad"><h4>读取失败</h4><p>${escapeHtml(result.msg || "媒体库不可用")}</p></article>`;
    return;
  }
  if (!result.media.length) {
    root.innerHTML = `<article class="admin-info-card"><h4>暂无媒体</h4><p>上传文章图片或音频后会显示在这里。</p></article>`;
    return;
  }
  root.replaceChildren();
  for (const item of result.media) {
    const card = document.createElement("article");
    card.className = "media-card";
    card.innerHTML = `${item.type === "audio" ? `<audio controls src="${escapeAttr(item.url)}"></audio>` : `<img src="${escapeAttr(item.url)}" alt="" loading="lazy">`}<div><strong>${escapeHtml(item.key)}</strong><small>${formatBytes(item.size)} · ${formatDateTime(item.uploaded)}</small><div class="row-actions"></div></div>`;
    const actions = card.querySelector(".row-actions");
    actions.append(
      actionButton("复制", () => copyText(item.url)),
      actionButton("设封面", () => setArticleCoverFromMedia(item.url)),
      actionButton("插入正文", () => insertMediaIntoArticle(item)),
      actionButton("删除", () => deleteMedia(item.key), "danger")
    );
    root.append(card);
  }
}

async function loadAssets() {
  const root = byId("assetRows");
  root.innerHTML = `<article class="admin-info-card"><h4>正在读取资源...</h4></article>`;
  const result = await api("/api/admin/assets/list", {
    kind: byId("assetKindFilter").value,
    status: byId("assetStatusFilter").value,
    search: byId("assetSearch").value.trim(),
    pageSize: 80
  });
  if (!result.success) {
    root.innerHTML = `<article class="admin-info-card admin-info-card--bad"><h4>读取失败</h4><p>${escapeHtml(result.msg || "资源管理不可用")}</p></article>`;
    return;
  }
  if (!result.assets.length) {
    root.innerHTML = `<article class="admin-info-card"><h4>暂无资源</h4><p>上传资源后会显示在这里。</p></article>`;
    return;
  }
  root.replaceChildren();
  for (const asset of result.assets) {
    const card = document.createElement("article");
    card.className = "asset-card";
    const preview = asset.kind === "image" || asset.kind === "site"
      ? `<img src="${escapeAttr(asset.url)}" alt="" loading="lazy">`
      : asset.kind === "audio"
        ? `<audio controls src="${escapeAttr(asset.url)}"></audio>`
        : `<div class="asset-file-icon">${escapeHtml(asset.kind)}</div>`;
    card.innerHTML = `${preview}<div><strong>${escapeHtml(asset.fileName || asset.key)}</strong><small>${escapeHtml(asset.kind)} · ${formatBytes(asset.fileSize)} · ${formatDateTime(asset.updatedAt)}</small><code>${escapeHtml(asset.key)}</code><div class="row-actions"></div></div>`;
    card.querySelector(".row-actions").append(
      actionButton("复制链接", () => copyText(asset.url)),
      actionButton("复制Key", () => copyText(asset.key)),
      actionButton("删除", () => deleteAsset(asset.id), "danger")
    );
    root.append(card);
  }
}

async function loadSoftwareCoverAssets() {
  const select = byId("softwareCoverAsset");
  if (!select) return;
  select.innerHTML = `<option value="">选择 R2 图片</option>`;
  const results = await Promise.all([
    api("/api/admin/assets/list", { kind: "image", status: "active", pageSize: 100 }),
    api("/api/admin/assets/list", { kind: "site", status: "active", pageSize: 100 })
  ]);
  const assets = results
    .filter(result => result.success)
    .flatMap(result => result.assets || [])
    .filter(asset => asset.kind === "image" || asset.kind === "site");
  for (const asset of assets) {
    const option = document.createElement("option");
    option.value = asset.url || `/media/${encodeURIComponent(asset.key)}`;
    option.textContent = `${asset.fileName || asset.key} (${formatBytes(asset.fileSize)})`;
    select.append(option);
  }
}

function useSoftwareCoverAsset() {
  const value = byId("softwareCoverAsset").value;
  if (!value) return toast("请先选择一张 R2 图片", true);
  byId("softwareCover").value = value;
  toast("已使用选中的 R2 图片");
}

async function uploadSoftwareCover() {
  const file = byId("softwareCoverFile").files[0];
  if (!file) return toast("请选择本地封面图片", true);
  const mediaType = mediaTypeFor(file);
  if (mediaType === "svg") return toast("不支持上传 SVG，请使用 PNG/JPG/WebP", true);
  if (mediaType !== "image") return toast("请选择图片文件", true);
  if (file.size > 8 * 1024 * 1024) return toast("封面图片不能超过 8MB", true);

  toast("正在上传封面");
  const result = await uploadArticleMedia(file, "image");
  if (!result.success) return toast(result.msg || "封面上传失败", true);
  byId("softwareCover").value = result.url;
  byId("softwareCoverFile").value = "";
  await loadSoftwareCoverAssets();
  toast("封面已上传并填入地址");
}

async function loadMusicCoverAssets() {
  const select = byId("musicCoverAsset");
  if (!select) return;
  select.innerHTML = `<option value="">选择 R2 图片</option>`;
  const results = await Promise.all([
    api("/api/admin/assets/list", { kind: "image", status: "active", pageSize: 100 }),
    api("/api/admin/assets/list", { kind: "site", status: "active", pageSize: 100 })
  ]);
  const assets = results.filter(result => result.success).flatMap(result => result.assets || []);
  for (const asset of assets) {
    const option = document.createElement("option");
    option.value = asset.url || `/media/${encodeURIComponent(asset.key)}`;
    option.textContent = `${asset.fileName || asset.key} (${formatBytes(asset.fileSize)})`;
    select.append(option);
  }
}

async function loadGalleryAssets() {
  const select = byId("galleryAsset");
  if (!select) return;
  select.innerHTML = `<option value="">选择图片</option>`;
  const storageId = byId("galleryStorage")?.value || "default";
  if (storageId === "cloudflare-images") {
    select.innerHTML = `<option value="">Cloudflare Images 请上传或粘贴图片 URL</option>`;
    return;
  }
  const result = await api("/api/admin/assets/list", { storageId, kind: "image", status: "active", pageSize: 100 });
  if (!result.success) {
    toast(result.msg || "读取 R2 图片失败", true);
    return;
  }
  for (const asset of result.assets || []) {
    if (asset.kind !== "image" && asset.kind !== "site") continue;
    const url = asset.url || asset.publicUrl || (asset.storageId === "default" && asset.key ? `/media/${encodeURIComponent(asset.key)}` : "");
    if (!url) continue;
    const option = document.createElement("option");
    option.value = JSON.stringify({
      url,
      key: asset.key || "",
      storageId: asset.storageId || storageId
    });
    option.textContent = `${asset.fileName || asset.key} (${formatBytes(asset.fileSize)})`;
    select.append(option);
  }
}

function useGalleryAsset() {
  const value = byId("galleryAsset").value;
  if (!value) return toast("请先选择一张 R2 图片", true);
  const asset = JSON.parse(value);
  byId("galleryImageUrl").value = asset.url || "";
  byId("galleryThumbUrl").value = asset.url || "";
  byId("galleryAssetKey").value = asset.key || "";
  byId("galleryStorage").value = asset.storageId || "default";
  toast("已使用选中的图片");
}

async function uploadGalleryImage() {
  const file = byId("galleryFile").files[0];
  if (!file) return toast("请选择本地图片", true);
  const mediaType = mediaTypeFor(file);
  if (mediaType === "svg") return toast("不支持上传 SVG，请使用 PNG/JPG/WebP", true);
  if (mediaType !== "image") return toast("请选择图片文件", true);
  if (file.size > 8 * 1024 * 1024) return toast("图片不能超过 8MB", true);
  toast("正在上传画廊图片");
  const storageId = byId("galleryStorage").value;
  const result = storageId === "cloudflare-images"
    ? await uploadCloudflareImage(file)
    : await uploadAssetMedia(file, "image", "gallery", "gallery", storageId);
  if (!result.success) return toast(result.msg || "图片上传失败", true);
  if (!result.url) return toast("图片已上传，但没有返回可用地址", true);
  byId("galleryImageUrl").value = result.url;
  byId("galleryThumbUrl").value = result.url;
  byId("galleryAssetKey").value = result.asset?.key || "";
  byId("galleryFile").value = "";
  await loadGalleryAssets();
  toast("画廊图片已上传");
}

async function uploadCloudflareImage(file) {
  try {
    const ticket = await api("/api/admin/images/direct-upload", {
      fileName: file.name || "gallery-image",
      contentType: file.type || ""
    });
    if (!ticket.success) return ticket;
    if (!ticket.uploadURL || !ticket.imageId) return { success: false, msg: "Cloudflare Images 没有返回上传地址" };
    const form = new FormData();
    form.append("file", file, file.name || "gallery-image");
    const response = await fetch(ticket.uploadURL, { method: "POST", body: form });
    const text = await response.text();
    const result = parseUploadResponse(text);
    if (!response.ok || result.success === false) {
      return { success: false, msg: result.errors?.[0]?.message || result.msg || `Cloudflare Images 上传失败：HTTP ${response.status}` };
    }
    return {
      success: true,
      url: ticket.url,
      asset: { key: ticket.imageId, storageId: "cloudflare-images", url: ticket.url }
    };
  } catch (error) {
    return { success: false, msg: `Cloudflare Images 上传失败：${error.message || "网络异常"}` };
  }
}

function previewGalleryImage() {
  const url = byId("galleryImageUrl").value.trim();
  if (!url) return toast("请先填写或选择图片地址", true);
  window.open(url, "_blank");
}

function useMusicCoverAsset() {
  const value = byId("musicCoverAsset").value;
  if (!value) return toast("请先选择一张 R2 图片", true);
  byId("musicCoverUrl").value = value;
  toast("已使用选中的 R2 封面");
}

async function uploadMusicCover() {
  const file = byId("musicCoverFile").files[0];
  if (!file) return toast("请选择本地封面图片", true);
  const mediaType = mediaTypeFor(file);
  if (mediaType === "svg") return toast("不支持上传 SVG，请使用 PNG/JPG/WebP", true);
  if (mediaType !== "image") return toast("请选择图片文件", true);
  if (file.size > 8 * 1024 * 1024) return toast("封面图片不能超过 8MB", true);
  toast("正在上传音乐封面");
  const result = await uploadAssetMedia(file, "image", "music-cover", "music-cover");
  if (!result.success) return toast(result.msg || "封面上传失败", true);
  if (!result.url) return toast("封面已上传，但没有返回可用地址", true);
  byId("musicCoverUrl").value = result.url;
  byId("musicCoverFile").value = "";
  await loadMusicCoverAssets();
  toast("音乐封面已上传");
}

async function uploadAssetMedia(file, kind, folder = "", refType = "", storageId = "default") {
  try {
    const data = await fileToBase64(file);
    const response = await fetch("/api/admin/assets/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({
        token,
        storageId,
        kind,
        folder,
        refType,
        fileName: file.name || "asset.bin",
        contentType: file.type || "",
        data
      })
    });
    const text = await response.text();
    const result = parseUploadResponse(text);
    if (!response.ok) return { success: false, msg: result.msg || `上传失败：HTTP ${response.status}` };
    const asset = result.asset || {};
    return {
      ...result,
      url: asset.url || asset.publicUrl || (asset.key ? `/media/${encodeURIComponent(asset.key)}` : "")
    };
  } catch (error) {
    return { success: false, msg: `上传失败：${error.message || "网络或接口异常"}` };
  }
}

async function uploadMusicAudio() {
  const file = byId("musicAudioFile").files[0];
  if (!file) return toast("请选择本地音频", true);
  const mediaType = mediaTypeFor(file);
  if (mediaType !== "audio") return toast("请选择音频文件", true);
  if (file.size > 30 * 1024 * 1024) return toast("音频不能超过 30MB，请先压缩或使用外链", true);
  toast("正在上传音乐音频");
  const result = await uploadArticleMedia(file, "audio");
  if (!result.success) return toast(result.msg || "音频上传失败", true);
  byId("musicAudioUrl").value = result.url;
  byId("musicAudioFile").value = "";
  previewMusic({ title: byId("musicTitle").value || file.name, artist: byId("musicArtist").value || "试听", audioUrl: result.url, coverUrl: byId("musicCoverUrl").value });
  toast("音频已上传，可试听");
}

async function uploadAsset(event) {
  event.preventDefault();
  const file = byId("assetFile").files[0];
  if (!file) return toast("请选择资源文件", true);
  const form = new FormData();
  form.append("token", token);
  form.append("kind", byId("assetKind").value);
  form.append("folder", byId("assetFolder").value.trim());
  form.append("file", file);
  toast("正在上传资源");
  const result = await uploadMultipart("/api/admin/assets/upload", form);
  if (!result.success) return toast(result.msg || "上传失败", true);
  byId("assetUploadForm").reset();
  await loadAssets();
  toast("资源已上传");
}

async function deleteAsset(assetId, force = false) {
  if (!confirm(force ? "确定强制删除这个资源和 R2 文件吗？" : "确定删除这个资源吗？")) return;
  const result = await api("/api/admin/assets/delete", { assetId, force });
  if (!result.success && result.references?.length) {
    const refs = result.references.map(ref => `${ref.type}: ${ref.title || ref.id}`).join("\n");
    if (confirm(`资源正在被使用：\n${refs}\n\n是否仍然强制删除？`)) return deleteAsset(assetId, true);
    return;
  }
  if (!result.success) return toast(result.msg || "删除失败", true);
  await loadAssets();
  toast("资源已删除");
}

async function saveStorage(event) {
  event.preventDefault();
  const result = await api("/api/admin/storage", storagePayload());
  if (!result.success) return toast(result.msg || "保存失败", true);
  resetStorageForm();
  render(result.catalog);
  toast("存储授权已保存");
}

async function saveNavigation(event) {
  event.preventDefault();
  const result = await api("/api/admin/navigation", navigationPayload());
  if (!result.success) return toast(result.msg || "保存失败", true);
  resetNavigationForm();
  render(result.catalog);
  toast("导航已保存");
}

async function saveArticle(event) {
  event.preventDefault();
  const result = await api("/api/admin/articles", articlePayload());
  if (!result.success) return toast(result.msg || "保存失败", true);
  clearArticleDraft(false);
  resetArticleForm();
  render(result.catalog);
  toast("文章已保存");
}

async function uploadArticleImage(target) {
  const file = byId("articleImageFile").files[0];
  if (!file) return toast("请选择要上传的图片或音频", true);
  const isAudioTarget = target === "audio";
  const isImageTarget = target === "cover" || target === "content";
  const mediaType = mediaTypeFor(file);
  if (mediaType === "svg") return toast("不支持上传 SVG，请改用 PNG/JPG/WebP", true);
  if (isAudioTarget && mediaType !== "audio") return toast("请选择音频文件后再插入音频", true);
  if (isImageTarget && mediaType !== "image") return toast("请选择图片文件后再上传图片", true);
  if (mediaType === "image" && file.size > 8 * 1024 * 1024) return toast("图片不能超过 8MB，请压缩后再上传", true);
  if (mediaType === "audio" && file.size > 30 * 1024 * 1024) return toast("音频不能超过 30MB，请压缩后再上传", true);
  toast("正在上传媒体");
  const result = await uploadArticleMedia(file, isAudioTarget ? "audio" : "image");
  if (!result.success) return toast(result.msg || "媒体上传失败", true);
  if (target === "cover") {
    byId("articleCover").value = result.url;
  } else if (target === "audio") {
    insertAtCursor(byId("articleContent"), `\n<figure class="article-audio"><audio controls preload="metadata" src="${result.url}"></audio></figure>\n`);
  } else {
    insertAtCursor(byId("articleContent"), `\n<figure><img src="${result.url}" alt=""><figcaption>图片说明</figcaption></figure>\n`);
  }
  updateArticleEditorMeta();
  toast("媒体已插入");
}

async function uploadArticleMedia(file, kind) {
  try {
    const data = await fileToBase64(file);
    const response = await fetch("/api/admin/article-image", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({
        token,
        kind,
        fileName: file.name || "article-media.bin",
        contentType: file.type || "",
        data
      })
    });
    const text = await response.text();
    const result = parseUploadResponse(text);
    if (!response.ok) return { success: false, msg: result.msg || `上传失败：HTTP ${response.status}` };
    return result;
  } catch (error) {
    return { success: false, msg: `上传失败：${error.message || "网络或接口异常"}` };
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || "").split(",")[1] || "");
    reader.onerror = () => reject(reader.error || new Error("读取文件失败"));
    reader.readAsDataURL(file);
  });
}

function parseUploadResponse(text) {
  const value = String(text || "").trim();
  if (!value) return {};
  if (value.startsWith("{")) return JSON.parse(value);
  const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(value)?.[1]?.replace(/\s+/g, " ").trim();
  return { success: false, msg: title ? `上传接口返回 HTML：${title}` : "上传接口返回 HTML，未命中上传 API" };
}

function mediaTypeFor(file) {
  const type = String(file?.type || "").toLowerCase();
  const name = String(file?.name || "").toLowerCase();
  if (type === "image/svg+xml" || /\.svg$/i.test(name)) return "svg";
  if (type.startsWith("image/")) return "image";
  if (type.startsWith("audio/")) return "audio";
  if (/\.(png|jpe?g|gif|webp|avif)$/i.test(name)) return "image";
  if (/\.(mp3|m4a|aac|wav|ogg|oga|webm|flac)$/i.test(name)) return "audio";
  return "";
}

function allowedPackageFile(file) {
  return /\.(zip|7z|exe|msi)$/i.test(String(file?.name || ""));
}

function insertArticleTable() {
  insertAtCursor(byId("articleContent"), `\n<table>\n  <thead>\n    <tr><th>项目</th><th>说明</th><th>状态</th></tr>\n  </thead>\n  <tbody>\n    <tr><td>示例</td><td>填写说明</td><td>完成</td></tr>\n  </tbody>\n</table>\n`);
  updateArticleEditorMeta();
}

function insertArticleQuote() {
  insertAtCursor(byId("articleContent"), `\n<blockquote>这里填写重点说明、提示或案例总结。</blockquote>\n`);
  updateArticleEditorMeta();
}

function insertArticleSnippet(snippet) {
  insertAtCursor(byId("articleContent"), snippet);
  updateArticleEditorMeta();
}

function insertAtCursor(textarea, snippet) {
  const start = textarea.selectionStart ?? textarea.value.length;
  const end = textarea.selectionEnd ?? start;
  textarea.value = textarea.value.slice(0, start) + snippet + textarea.value.slice(end);
  textarea.focus();
  textarea.selectionStart = textarea.selectionEnd = start + snippet.length;
}

async function testStorage() {
  const payload = storagePayload();
  toast("正在测试 R2 连接，请稍候");
  const result = await api("/api/admin/storage/test", payload);
  if (!result.success) return toast(result.msg || "连接测试失败", true);
  toast(result.msg || "连接测试成功");
}

async function saveSoftware(event) {
  event.preventDefault();
  const payload = {
    id: byId("softwareId").value,
    name: byId("softwareName").value.trim(),
    slug: byId("softwareSlug").value.trim(),
    categoryId: byId("softwareCategory").value,
    coverUrl: byId("softwareCover").value.trim(),
    description: byId("softwareDescription").value.trim(),
    sortOrder: Number(byId("softwareSort").value || 0),
    status: byId("softwareStatus").value
  };
  const result = await api("/api/admin/software", payload);
  if (!result.success) return toast(result.msg || "保存失败", true);
  resetSoftwareForm();
  render(result.catalog);
  toast("软件已保存");
}

async function saveMusic(event) {
  event.preventDefault();
  const payload = {
    id: byId("musicId").value,
    title: byId("musicTitle").value.trim(),
    artist: byId("musicArtist").value.trim(),
    album: byId("musicAlbum").value.trim(),
    neteaseId: byId("musicNeteaseId").value.trim(),
    audioUrl: byId("musicAudioUrl").value.trim(),
    coverUrl: byId("musicCoverUrl").value.trim(),
    lyric: byId("musicLyric").value.trim(),
    tags: byId("musicTags").value.split(/[,，\n]/).map(item => item.trim()).filter(Boolean),
    featured: byId("musicFeatured").checked,
    sortOrder: Number(byId("musicSort").value || 0),
    status: byId("musicStatus").value
  };
  const result = await api("/api/admin/music", payload);
  if (!result.success) return toast(result.msg || "保存失败", true);
  resetMusicForm();
  render(result.catalog);
  toast("音乐已保存");
}

async function deleteMusic(id) {
  if (!confirm("确定删除这首音乐吗？R2 文件不会自动删除。")) return;
  const result = await api("/api/admin/music", { action: "delete", id });
  if (!result.success) return toast(result.msg || "删除失败", true);
  render(result.catalog);
  toast("音乐已删除");
}

async function saveGallery(event) {
  event.preventDefault();
  const imageUrl = byId("galleryImageUrl").value.trim();
  const payload = {
    id: byId("galleryId").value,
    title: byId("galleryTitle").value.trim(),
    description: byId("galleryDescription").value.trim(),
    imageUrl,
    thumbUrl: byId("galleryThumbUrl").value.trim() || imageUrl,
    storageId: byId("galleryStorage").value,
    assetKey: byId("galleryAssetKey").value.trim(),
    source: byId("galleryStorage").value === "cloudflare-images" ? "cloudflare-images" : /^https?:\/\//i.test(imageUrl) && !byId("galleryAssetKey").value.trim() ? "network" : "r2",
    tags: byId("galleryTags").value.split(/[,，\n]/).map(item => item.trim()).filter(Boolean),
    featured: byId("galleryFeatured").checked,
    sortOrder: Number(byId("gallerySort").value || 0),
    status: byId("galleryStatus").value
  };
  const result = await api("/api/admin/gallery", payload);
  if (!result.success) return toast(result.msg || "保存失败", true);
  resetGalleryForm();
  render(result.catalog);
  toast("画廊图片已保存");
}

async function deleteGallery(id) {
  if (!confirm("确定删除这张画廊图片吗？R2 文件不会自动删除。")) return;
  const result = await api("/api/admin/gallery", { action: "delete", id });
  if (!result.success) return toast(result.msg || "删除失败", true);
  render(result.catalog);
  toast("画廊图片已删除");
}

async function saveCategory(event) {
  event.preventDefault();
  const payload = {
    id: byId("categoryId").value,
    name: byId("categoryName").value.trim(),
    slug: byId("categorySlug").value.trim(),
    sortOrder: Number(byId("categorySort").value || 0),
    status: byId("categoryStatus").value
  };
  const result = await api("/api/admin/categories", payload);
  if (!result.success) return toast(result.msg || "保存失败", true);
  resetCategoryForm();
  render(result.catalog);
  toast("分类已保存");
}

async function uploadRelease(event) {
  event.preventDefault();
  const file = byId("releaseFile").files[0];
  if (!file) return toast("请选择安装包", true);
  if (!allowedPackageFile(file)) return toast("安装包格式不支持，请上传 zip、7z、exe 或 msi 文件", true);
  if (file.size > MAX_CHUNKED_SIZE) return toast("安装包不能超过 5GB", true);

  const softwareId = byId("releaseSoftware").value;
  const version = byId("releaseVersion").value.trim();
  if (!softwareId || !version) return toast("请选择软件并填写版本号", true);

  const storageId = byId("releaseStorage").value;
  const changelog = byId("releaseChangelog").value.trim();
  const isLatest = byId("releaseLatest").checked;
  let result;

  if (file.size > CHUNK_UPLOAD_THRESHOLD && storageId === "default") {
    result = await uploadChunked(file, { softwareId, version, changelog, isLatest });
  } else if (file.size > DIRECT_UPLOAD_LIMIT) {
    return toast("文件超过 95MB 且使用外部存储，请先上传到 R2 再用登记功能发布。", true);
  } else {
    const form = new FormData();
    form.append("token", token);
    form.append("softwareId", softwareId);
    form.append("storageId", storageId);
    form.append("version", version);
    form.append("changelog", changelog);
    form.append("isLatest", isLatest ? "1" : "0");
    form.append("file", file);
    result = await uploadMultipart("/api/admin/releases", form, { title: "正在发布版本", fileName: file.name });
  }

  if (!result.success) return toast(result.msg || "上传失败", true);
  byId("releaseForm").reset();
  byId("releaseLatest").checked = true;
  render(result.catalog);
  toast("版本已发布，列表已刷新");
}

async function registerUploadedRelease(event) {
  event.preventDefault();
  const payload = {
    softwareId: byId("registerSoftware").value,
    version: byId("registerVersion").value.trim(),
    fileKey: byId("registerFileKey").value.trim(),
    fileName: byId("registerFileName").value.trim(),
    sha256: byId("registerSha256").value.trim(),
    changelog: byId("registerChangelog").value.trim(),
    isLatest: byId("registerLatest").checked ? "1" : "0"
  };
  if (!payload.softwareId || !payload.version || !payload.fileKey) {
    return toast("请填写软件、版本号和 R2 文件路径", true);
  }
  const result = await api("/api/admin/releases/register", payload);
  if (!result.success) return toast(result.msg || "登记失败", true);
  byId("releaseRegisterForm").reset();
  byId("registerLatest").checked = true;
  render(result.catalog);
  toast("已登记 R2 文件并发布版本");
}

function uploadMultipart(url, form, progress = {}) {
  showUploadProgress(progress.title || "正在上传", progress.fileName || "");
  return new Promise(resolve => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);

    xhr.upload.onprogress = event => {
      if (!event.lengthComputable) {
        updateUploadProgress(0, "正在上传，等待服务器接收文件...");
        return;
      }

      const percent = Math.max(1, Math.min(99, Math.round((event.loaded / event.total) * 100)));
      updateUploadProgress(percent, `${formatBytes(event.loaded)} / ${formatBytes(event.total)}`);
    };

    xhr.onload = () => {
      const result = parseUploadResponse(xhr.responseText);
      if (xhr.status >= 200 && xhr.status < 300) {
        updateUploadProgress(100, "上传完成，正在刷新列表...");
        setTimeout(() => hideUploadProgress(), 500);
        resolve(result);
        return;
      }

      hideUploadProgress();
      resolve({ success: false, msg: result.msg || `上传失败：HTTP ${xhr.status}` });
    };

    xhr.onerror = () => {
      hideUploadProgress();
      resolve({ success: false, msg: "上传失败：网络或接口异常" });
    };

    xhr.onabort = () => {
      hideUploadProgress();
      resolve({ success: false, msg: "上传已取消" });
    };

    xhr.send(form);
  });
}

async function updateRelease(releaseId, action) {
  const result = await api("/api/admin/releases/update", { releaseId, action });
  if (!result.success) return toast(result.msg || "操作失败", true);
  render(result.catalog);
  toast("版本已更新");
}

async function replaceReleaseFile(releaseId, input) {
  const file = input.files?.[0];
  input.value = "";
  if (!file) return;
  if (!allowedPackageFile(file)) return toast("安装包格式不支持，请上传 zip、7z、exe 或 msi 文件", true);
  if (file.size > MAX_CHUNKED_SIZE) return toast("安装包不能超过 5GB", true);
  if (!confirm(`确定用 ${file.name} 覆盖这个版本的安装包吗？版本号和下载链接会保持不变。`)) return;

  if (file.size > DIRECT_UPLOAD_LIMIT) {
    return toast("替换功能暂不支持大文件分片上传。请删除旧版本后重新发布。", true);
  }

  const form = new FormData();
  form.append("token", token);
  form.append("releaseId", releaseId);
  form.append("file", file);

  const result = await uploadMultipart("/api/admin/releases/replace", form, { title: "正在替换安装包", fileName: file.name });
  if (!result.success) return toast(result.msg || "替换失败", true);
  render(result.catalog);
  toast("安装包已替换，列表已刷新");
}

async function deleteRelease(releaseId) {
  if (!confirm("确定删除这个版本记录吗？R2 文件不会自动删除。")) return;
  const result = await api("/api/admin/releases/delete", { releaseId });
  if (!result.success) return toast(result.msg || "删除失败", true);
  render(result.catalog);
  toast("版本已删除");
}

async function deleteMedia(key) {
  if (!confirm("确定删除这个媒体文件吗？文章中已使用的图片/音频会失效。")) return;
  const result = await api("/api/admin/media/delete", { key });
  if (!result.success) return toast(result.msg || "删除失败", true);
  await loadMedia("all");
  toast("媒体已删除");
}

function setArticleCoverFromMedia(url) {
  byId("articleCover").value = url;
  updateArticleEditorMeta();
  showPanel("articlePanel");
  toast("已设为文章封面");
}

function insertMediaIntoArticle(item) {
  const snippet = item.type === "audio"
    ? `\n<figure class="article-audio"><audio controls preload="metadata" src="${item.url}"></audio></figure>\n`
    : `\n<figure><img src="${item.url}" alt=""><figcaption>图片说明</figcaption></figure>\n`;
  insertAtCursor(byId("articleContent"), snippet);
  updateArticleEditorMeta();
  showPanel("articlePanel");
  toast("媒体已插入正文");
}

async function copyText(value) {
  try {
    await navigator.clipboard.writeText(value);
    toast("已复制链接");
  } catch {
    toast(value, true);
  }
}

let adminMusicPreview = null;

function previewMusicFromForm() {
  previewMusic({
    title: byId("musicTitle").value || "未命名音乐",
    artist: byId("musicArtist").value || "未知歌手",
    audioUrl: byId("musicAudioUrl").value,
    neteaseId: byId("musicNeteaseId").value
  });
}

function previewMusic(item) {
  const url = musicPlayableUrl(item);
  if (!url) return toast("请先填写音频地址或网易云音乐 ID", true);
  if (!adminMusicPreview) adminMusicPreview = new Audio();
  adminMusicPreview.src = url;
  adminMusicPreview.play().then(() => toast(`正在试听：${item.title || "音乐"}`)).catch(() => toast("浏览器阻止了试听，请再次点击试听", true));
}

function musicPlayableUrl(item) {
  if (item.audioUrl) return item.audioUrl;
  if (item.neteaseId) return `https://music.163.com/song/media/outer/url?id=${encodeURIComponent(item.neteaseId)}.mp3`;
  return "";
}

async function deleteSoftware(id) {
  if (!confirm("确定删除这个软件及其版本记录吗？R2 文件不会自动删除。")) return;
  const result = await api("/api/admin/software/delete", { id });
  if (!result.success) return toast(result.msg || "删除失败", true);
  render(result.catalog);
}

async function deleteCategory(id) {
  if (!confirm("确定删除这个分类吗？")) return;
  const result = await api("/api/admin/categories/delete", { id });
  if (!result.success) return toast(result.msg || "删除失败", true);
  render(result.catalog);
}

async function deleteStorage(id) {
  if (!confirm("确定删除这个存储授权吗？")) return;
  const result = await api("/api/admin/storage/delete", { id });
  if (!result.success) return toast(result.msg || "删除失败", true);
  render(result.catalog);
}

async function deleteNavigation(id) {
  if (!confirm("确定删除这个导航项吗？")) return;
  const result = await api("/api/admin/navigation/delete", { id });
  if (!result.success) return toast(result.msg || "删除失败", true);
  render(result.catalog);
}

async function deleteArticle(id) {
  if (!confirm("确定删除这篇文章吗？")) return;
  const result = await api("/api/admin/articles/delete", { id });
  if (!result.success) return toast(result.msg || "删除失败", true);
  render(result.catalog);
}

function fillSoftwareForm(item) {
  showPanel("softwarePanel");
  byId("softwareId").value = item.id;
  byId("softwareName").value = item.name;
  byId("softwareSlug").value = item.slug;
  byId("softwareCategory").value = item.categoryId;
  byId("softwareCover").value = item.coverUrl || "";
  byId("softwareDescription").value = item.description || "";
  byId("softwareSort").value = item.sortOrder || 0;
  byId("softwareStatus").value = item.status || "active";
}

function fillCategoryForm(item) {
  showPanel("categoryPanel");
  byId("categoryId").value = item.id;
  byId("categoryName").value = item.name;
  byId("categorySlug").value = item.slug;
  byId("categorySort").value = item.sortOrder || 0;
  byId("categoryStatus").value = item.status || "active";
}

function fillMusicForm(item) {
  showPanel("musicPanel");
  byId("musicId").value = item.id;
  byId("musicTitle").value = item.title || "";
  byId("musicArtist").value = item.artist || "";
  byId("musicAlbum").value = item.album || "";
  byId("musicNeteaseId").value = item.neteaseId || "";
  byId("musicAudioUrl").value = item.audioUrl || "";
  byId("musicCoverUrl").value = item.coverUrl || "";
  byId("musicLyric").value = item.lyric || "";
  byId("musicTags").value = (item.tags || []).join(", ");
  byId("musicFeatured").checked = Boolean(item.featured);
  byId("musicSort").value = item.sortOrder || 0;
  byId("musicStatus").value = item.status || "draft";
}

function fillGalleryForm(item) {
  showPanel("galleryPanel");
  byId("galleryId").value = item.id;
  byId("galleryTitle").value = item.title || "";
  byId("galleryDescription").value = item.description || "";
  byId("galleryImageUrl").value = item.imageUrl || "";
  byId("galleryThumbUrl").value = item.thumbUrl || "";
  byId("galleryStorage").value = item.storageId || "default";
  byId("galleryAssetKey").value = item.assetKey || "";
  byId("galleryTags").value = (item.tags || []).join(", ");
  byId("galleryFeatured").checked = Boolean(item.featured);
  byId("gallerySort").value = item.sortOrder || 0;
  byId("galleryStatus").value = item.status || "draft";
  loadGalleryAssets();
}

function fillStorageForm(item) {
  showPanel("storagePanel");
  byId("storageId").value = item.id;
  byId("storageName").value = item.name;
  byId("storageAccountId").value = item.accountId;
  byId("storageBucket").value = item.bucket;
  byId("storageAccessKeyId").value = item.accessKeyId;
  byId("storageSecretAccessKey").value = "";
  byId("storageEndpoint").value = item.endpoint || "";
  byId("storagePublicBaseUrl").value = item.publicBaseUrl || "";
  byId("storageSort").value = item.sortOrder || 0;
  byId("storageStatus").value = item.status || "active";
}

function fillNavigationForm(item) {
  showPanel("navigationPanel");
  byId("navigationId").value = item.id;
  byId("navigationLabel").value = item.label;
  byId("navigationHref").value = item.href;
  byId("navigationSort").value = item.sortOrder || 0;
  byId("navigationStatus").value = item.status || "active";
  byId("navigationExternal").checked = Boolean(item.external);
}

function fillArticleForm(item) {
  showPanel("articlePanel");
  if (hasArticleDraft() && !confirm("本地有未清除的草稿。继续编辑线上文章会覆盖当前表单，是否继续？")) return;
  byId("articleId").value = item.id;
  byId("articleTitle").value = item.title;
  byId("articleSlug").value = item.slug;
  byId("articleSummary").value = item.summary || "";
  byId("articleCover").value = item.coverUrl || "";
  byId("articleContent").value = item.content || "";
  byId("articleCategory").value = item.category || "";
  byId("articleTags").value = (item.tags || []).join("，");
  byId("articleSeoTitle").value = item.seoTitle || "";
  byId("articleSeoDescription").value = item.seoDescription || "";
  byId("articleFeatured").checked = Boolean(item.featured);
  byId("articleSort").value = item.sortOrder || 0;
  byId("articleStatus").value = item.status || "draft";
  articleSoftwareSelection = new Set(item.softwareIds || []);
  renderArticleOptions();
  updateArticleEditorMeta();
  renderArticleRows();
  byId("articleTitle").focus();
}

function storagePayload() {
  return {
    id: byId("storageId").value,
    name: byId("storageName").value.trim(),
    accountId: byId("storageAccountId").value.trim(),
    bucket: byId("storageBucket").value.trim(),
    accessKeyId: byId("storageAccessKeyId").value.trim(),
    secretAccessKey: byId("storageSecretAccessKey").value.trim(),
    endpoint: byId("storageEndpoint").value.trim(),
    publicBaseUrl: byId("storagePublicBaseUrl").value.trim(),
    sortOrder: Number(byId("storageSort").value || 0),
    status: byId("storageStatus").value
  };
}

function navigationPayload() {
  return {
    id: byId("navigationId").value,
    label: byId("navigationLabel").value.trim(),
    href: byId("navigationHref").value.trim(),
    sortOrder: Number(byId("navigationSort").value || 0),
    status: byId("navigationStatus").value,
    external: byId("navigationExternal").checked
  };
}

function articlePayload() {
  return {
    id: byId("articleId").value,
    title: byId("articleTitle").value.trim(),
    slug: byId("articleSlug").value.trim(),
    summary: byId("articleSummary").value.trim(),
    coverUrl: byId("articleCover").value.trim(),
    content: byId("articleContent").value.trim(),
    category: byId("articleCategory").value.trim(),
    tags: byId("articleTags").value.split(/[,，\n]/).map(item => item.trim()).filter(Boolean),
    seoTitle: byId("articleSeoTitle").value.trim(),
    seoDescription: byId("articleSeoDescription").value.trim(),
    featured: byId("articleFeatured").checked,
    softwareIds: Array.from(articleSoftwareSelection),
    sortOrder: Number(byId("articleSort").value || 0),
    status: byId("articleStatus").value
  };
}

function resetSoftwareForm() {
  byId("softwareForm").reset();
  byId("softwareId").value = "";
  byId("softwareSort").value = "10";
}

function resetCategoryForm() {
  byId("categoryForm").reset();
  byId("categoryId").value = "";
  byId("categorySort").value = "10";
}

function resetMusicForm() {
  byId("musicForm").reset();
  byId("musicId").value = "";
  byId("musicSort").value = "10";
  byId("musicStatus").value = "published";
}

function resetGalleryForm() {
  byId("galleryForm").reset();
  byId("galleryId").value = "";
  byId("galleryAssetKey").value = "";
  byId("gallerySort").value = "10";
  byId("galleryStatus").value = "published";
  byId("galleryStorage").value = "default";
  loadGalleryAssets();
}

function resetStorageForm() {
  byId("storageForm").reset();
  byId("storageId").value = "";
  byId("storageSort").value = "10";
}

function resetNavigationForm() {
  byId("navigationForm").reset();
  byId("navigationId").value = "";
  byId("navigationSort").value = "10";
}

function resetArticleForm() {
  if (hasArticleDraft() && !confirm("本地有未清除的草稿。新建文章会清空当前表单，是否继续？")) return;
  byId("articleForm").reset();
  byId("articleId").value = "";
  byId("articleSort").value = "10";
  articleSoftwareCategory = "all";
  articleSoftwareSelection.clear();
  renderArticleOptions();
  updateArticleEditorMeta();
  renderArticleRows();
}

function scheduleArticleDraftSave() {
  window.clearTimeout(articleDraftTimer);
  articleDraftTimer = window.setTimeout(saveArticleDraft, 350);
}

function saveArticleDraft() {
  const payload = articlePayload();
  const hasContent = [payload.title, payload.slug, payload.summary, payload.coverUrl, payload.content, payload.category, payload.seoTitle, payload.seoDescription].some(Boolean) || payload.tags.length || payload.softwareIds.length;
  if (!hasContent) {
    updateArticleDraftStatus();
    return;
  }
  localStorage.setItem(ARTICLE_DRAFT_KEY, JSON.stringify({ savedAt: Date.now(), payload }));
  updateArticleDraftStatus();
}

function restoreArticleDraft() {
  const draft = readArticleDraft();
  if (!draft) return toast("没有可恢复的本地草稿", true);
  if (!confirm(`恢复 ${formatDateTime(draft.savedAt)} 保存的本地草稿？当前表单内容会被覆盖。`)) return;
  fillArticleDraft(draft.payload || {});
  toast("本地草稿已恢复");
}

function clearArticleDraft(showToast = true) {
  localStorage.removeItem(ARTICLE_DRAFT_KEY);
  updateArticleDraftStatus();
  if (showToast) toast("本地草稿已清除");
}

function fillArticleDraft(item) {
  byId("articleId").value = item.id || "";
  byId("articleTitle").value = item.title || "";
  byId("articleSlug").value = item.slug || "";
  byId("articleSummary").value = item.summary || "";
  byId("articleCover").value = item.coverUrl || "";
  byId("articleContent").value = item.content || "";
  byId("articleCategory").value = item.category || "";
  byId("articleTags").value = (item.tags || []).join("，");
  byId("articleSeoTitle").value = item.seoTitle || "";
  byId("articleSeoDescription").value = item.seoDescription || "";
  byId("articleFeatured").checked = Boolean(item.featured);
  byId("articleSort").value = item.sortOrder || 10;
  byId("articleStatus").value = item.status || "draft";
  articleSoftwareSelection = new Set(item.softwareIds || []);
  renderArticleOptions();
  updateArticleEditorMeta();
}

function hasArticleDraft() {
  return Boolean(readArticleDraft());
}

function readArticleDraft() {
  try {
    const draft = JSON.parse(localStorage.getItem(ARTICLE_DRAFT_KEY) || "null");
    return draft?.payload ? draft : null;
  } catch {
    return null;
  }
}

function updateArticleDraftStatus() {
  const status = byId("articleDraftStatus");
  if (!status) return;
  const draft = readArticleDraft();
  status.textContent = draft ? `本地草稿：${formatDateTime(draft.savedAt)} 已自动保存` : "本地草稿：暂无";
}

function updateArticleSoftwareHint() {
  const hint = byId("articleSoftwareHint");
  const count = articleSoftwareSelection.size;
  hint.textContent = count ? `已关联 ${count} 个软件。可以继续按分类选择，或点击“不关联软件”清空。` : "可以按分类选择相关软件，也可以不选。";
}

function updateArticleEditorMeta() {
  const isEditing = Boolean(byId("articleId").value);
  const title = byId("articleTitle").value.trim();
  const summary = byId("articleSummary").value.trim();
  const content = byId("articleContent").value.trim();
  const cover = byId("articleCover").value.trim();
  byId("articleEditorMode").textContent = isEditing ? `正在编辑：${title || "未命名文章"}` : "新建文章";
  byId("articleWordCount").textContent = `${countWords(content)} 字`;
  byId("articleSummaryCount").textContent = `摘要 ${summary.length}/180`;
  const preview = byId("articleCoverPreview");
  preview.innerHTML = cover ? `<img src="${escapeAttr(cover)}" alt=""><span>封面预览</span>` : "<span>封面预览</span>";
  const articlePreview = byId("articlePreview");
  if (articlePreview) articlePreview.innerHTML = renderArticleContent(content);
}

function countWords(value) {
  const text = String(value || "").replace(/<[^>]+>/g, " ").trim();
  return text ? text.length : 0;
}

function renderArticleContent(content) {
  const value = String(content || "").trim();
  if (!value) return "<p>正文预览会显示在这里。</p>";
  if (/<[a-z][\s\S]*>/i.test(value)) return sanitizeArticleHtml(value);
  return markdownToHtml(value);
}

function sanitizeArticleHtml(html) {
  const template = document.createElement("template");
  template.innerHTML = String(html || "");
  const allowedTags = new Set(["A", "P", "BR", "STRONG", "B", "EM", "I", "UL", "OL", "LI", "BLOCKQUOTE", "H2", "H3", "IMG", "FIGURE", "FIGCAPTION", "AUDIO", "SOURCE", "TABLE", "THEAD", "TBODY", "TR", "TH", "TD", "PRE", "CODE"]);
  const allowedAttrs = {
    A: new Set(["href", "target", "rel"]),
    IMG: new Set(["src", "alt", "loading"]),
    AUDIO: new Set(["src", "controls", "preload"]),
    SOURCE: new Set(["src", "type"]),
    FIGURE: new Set(["class"]),
    CODE: new Set(["class"]),
    PRE: new Set(["class"]),
    TABLE: new Set(["class"])
  };

  const cleanNode = node => {
    if (node.nodeType === Node.COMMENT_NODE) {
      node.remove();
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    if (!allowedTags.has(node.tagName)) {
      node.replaceWith(...Array.from(node.childNodes));
      return;
    }
    for (const attr of Array.from(node.attributes)) {
      const allowed = allowedAttrs[node.tagName]?.has(attr.name);
      if (!allowed || attr.name.startsWith("on") || attr.value.startsWith("javascript:")) node.removeAttribute(attr.name);
    }
    if (node.tagName === "A") {
      const href = node.getAttribute("href") || "";
      if (!/^(https?:\/\/|\/)/.test(href)) node.removeAttribute("href");
      node.setAttribute("rel", "noopener");
      if (/^https?:\/\//.test(href)) node.setAttribute("target", "_blank");
    }
    if ((node.tagName === "IMG" || node.tagName === "AUDIO" || node.tagName === "SOURCE") && !/^(https?:\/\/|\/)/.test(node.getAttribute("src") || "")) {
      node.removeAttribute("src");
    }
    for (const child of Array.from(node.childNodes)) cleanNode(child);
  };
  for (const child of Array.from(template.content.childNodes)) cleanNode(child);
  return template.innerHTML;
}

function markdownToHtml(value) {
  const blocks = [];
  const lines = String(value || "").replace(/\r\n/g, "\n").split("\n");
  let paragraph = [];
  let list = [];
  let code = [];
  let inCode = false;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    blocks.push(`<p>${inlineMarkdown(paragraph.join("\n")).replace(/\n/g, "<br>")}</p>`);
    paragraph = [];
  };
  const flushList = () => {
    if (!list.length) return;
    blocks.push(`<ul>${list.map(item => `<li>${inlineMarkdown(item)}</li>`).join("")}</ul>`);
    list = [];
  };

  for (const line of lines) {
    if (/^```/.test(line.trim())) {
      if (inCode) {
        blocks.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);
        code = [];
        inCode = false;
      } else {
        flushParagraph();
        flushList();
        inCode = true;
      }
      continue;
    }
    if (inCode) {
      code.push(line);
      continue;
    }
    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }
    const heading = /^(#{2,3})\s+(.+)$/.exec(line);
    if (heading) {
      flushParagraph();
      flushList();
      const level = heading[1].length;
      blocks.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
      continue;
    }
    const quote = /^>\s+(.+)$/.exec(line);
    if (quote) {
      flushParagraph();
      flushList();
      blocks.push(`<blockquote>${inlineMarkdown(quote[1])}</blockquote>`);
      continue;
    }
    const bullet = /^[-*]\s+(.+)$/.exec(line);
    if (bullet) {
      flushParagraph();
      list.push(bullet[1]);
      continue;
    }
    paragraph.push(line);
  }
  flushParagraph();
  flushList();
  if (inCode) blocks.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);
  return blocks.join("");
}

function inlineMarkdown(value) {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]+)\)/g, `<a href="$2" target="_blank" rel="noopener">$1</a>`);
}

function articleStatusLabel(status) {
  return status === "published" ? "已发布" : status === "draft" ? "草稿" : "隐藏";
}

function articleStatusClass(status) {
  return status === "published" ? "active" : status === "draft" ? "draft" : "disabled";
}

function defaultViewFor(panelId, moduleId = moduleForPanel(panelId)) {
  const config = ADMIN_MODULES[moduleId] || ADMIN_MODULES.software;
  const item = config.items.find(entry => entry.panel === panelId);
  return item?.view || panelId;
}

function showPanel(id, options = {}) {
  document.querySelectorAll(".tab-panel").forEach(panel => panel.hidden = panel.id !== id);
  const moduleId = options.moduleId || moduleForPanel(id);
  const view = options.view || defaultViewFor(id, moduleId);
  document.body.dataset.adminView = view;
  document.body.classList.toggle("admin-overview", id === "softwarePanel" && view === "softwareEdit");
  document.querySelectorAll(".module-sidebar button").forEach(button => button.classList.toggle("is-active", button.dataset.module === moduleId));
  renderModuleNav(moduleId, id, view);
  const target = document.getElementById(id);
  if (target) target.scrollIntoView({ block: "start", behavior: "smooth" });
}

function moduleForPanel(panelId) {
  for (const [moduleId, config] of Object.entries(ADMIN_MODULES)) {
    if (config.items.some(item => item.panel === panelId)) return moduleId;
  }
  return "software";
}

function renderModuleNav(moduleId, activePanel, activeView = defaultViewFor(activePanel, moduleId)) {
  const root = byId("moduleNav");
  const config = ADMIN_MODULES[moduleId] || ADMIN_MODULES.software;
  if (!root) return;
  root.innerHTML = `
    <div>
      <strong>${escapeHtml(config.title)}</strong>
      <span>${escapeHtml(config.description)}</span>
    </div>
    <nav>
      ${config.items.map(item => {
        const view = item.view || defaultViewFor(item.panel, moduleId);
        const isActive = item.panel === activePanel && view === activeView;
        return `<button type="button" class="${isActive ? "is-active" : ""}" data-module="${escapeAttr(moduleId)}" data-panel="${escapeAttr(item.panel)}" data-view="${escapeAttr(view)}" data-anchor="${escapeAttr(item.anchor || "")}"><b>${escapeHtml(item.label)}</b><small>${escapeHtml(item.action)}</small></button>`;
      }).join("")}
    </nav>
  `;
  root.querySelectorAll("button").forEach(button => {
    button.addEventListener("click", () => {
      showPanel(button.dataset.panel, { moduleId: button.dataset.module, view: button.dataset.view });
      if (button.dataset.anchor) {
        window.setTimeout(() => byId(button.dataset.anchor)?.scrollIntoView({ block: "center", behavior: "smooth" }), 80);
      }
    });
  });
}

async function api(url, payload = {}) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
  return response.json();
}

async function loginApi(password) {
  const response = await fetch("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password })
  });
  return response.json();
}

function actionButton(text, handler, className = "ghost") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = text;
  button.addEventListener("click", handler);
  return button;
}

function debounce(fn, delay) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function byId(id) {
  return document.getElementById(id);
}

function toast(message, isError = false) {
  const toastEl = byId("toast");
  toastEl.textContent = message;
  toastEl.style.background = isError ? "#ef4444" : "#6366f1";
  toastEl.classList.add("is-visible");
  window.setTimeout(() => toastEl.classList.remove("is-visible"), 2600);
}

function showUploadProgress(title, fileName) {
  byId("uploadProgressTitle").textContent = title;
  byId("uploadProgressPercent").textContent = "0%";
  byId("uploadProgressBar").style.width = "0%";
  byId("uploadProgressText").textContent = fileName ? `正在上传：${fileName}` : "请保持页面打开，上传完成后会自动刷新。";
  byId("uploadProgress").hidden = false;
}

function updateUploadProgress(percent, text) {
  byId("uploadProgressPercent").textContent = `${percent}%`;
  byId("uploadProgressBar").style.width = `${percent}%`;
  if (text) byId("uploadProgressText").textContent = text;
}

function hideUploadProgress() {
  byId("uploadProgress").hidden = true;
}

function formatDateTime(timestamp) {
  if (!timestamp) return "-";
  return new Date(timestamp).toLocaleString("zh-CN", { hour12: false });
}

function formatBytes(bytes) {
  const value = Number(bytes || 0);
  if (!value) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let index = 0;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }
  return `${size.toFixed(size >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[char]);
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}


async function uploadChunked(file, options) {
  const { softwareId, version, changelog, isLatest } = options;
  showUploadProgress("正在初始化分片上传", file.name);

  const presignResult = await api("/api/admin/releases/presign", {
    softwareId,
    version,
    fileName: file.name,
    fileSize: file.size
  });

  if (!presignResult.success) {
    hideUploadProgress();
    return presignResult;
  }

  const { uploadId, fileKey } = presignResult;
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  const parts = [];
  const uploadStart = Date.now();
  let uploadedBytes = 0;

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);
    const partNumber = i + 1;
    const percent = Math.max(1, Math.min(95, Math.round((i / totalChunks) * 95)));
    const elapsed = (Date.now() - uploadStart) / 1000;
    const speed = elapsed > 0 ? uploadedBytes / elapsed : 0;
    const eta = speed > 0 ? Math.round((file.size - uploadedBytes) / speed) : 0;
    const etaText = eta > 60 ? `${Math.floor(eta / 60)}分${eta % 60}秒` : `${eta}秒`;
    updateUploadProgress(percent, `分片 ${partNumber}/${totalChunks} · ${formatBytes(uploadedBytes)} / ${formatBytes(file.size)} · ${formatBytes(speed)}/s · 预计 ${etaText}`);

    let retries = 3;
    let partResult = null;

    while (retries > 0) {
      try {
        const response = await fetch("/api/admin/releases/upload-part", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/octet-stream",
            "X-Upload-Id": uploadId,
            "X-File-Key": fileKey,
            "X-Part-Number": String(partNumber)
          },
          body: chunk
        });
        partResult = await response.json();
        if (partResult.success) break;
      } catch (error) {
        partResult = { success: false, msg: error.message || "网络异常" };
      }
      retries--;
      if (retries > 0) {
        updateUploadProgress(percent, `分片 ${partNumber} 失败，${retries} 次重试中...`);
        await sleep(1500);
      }
    }

    if (!partResult?.success) {
      await api("/api/admin/releases/abort-upload", { uploadId, fileKey }).catch(() => {});
      hideUploadProgress();
      return { success: false, msg: partResult?.msg || `分片 ${partNumber} 上传失败` };
    }

    parts.push({ partNumber, etag: partResult.etag });
    uploadedBytes += (end - start);
  }

  updateUploadProgress(97, "正在完成上传并发布版本...");

  const completeResult = await api("/api/admin/releases/complete-upload", {
    uploadId,
    fileKey,
    parts,
    softwareId,
    version,
    fileName: file.name,
    fileSize: file.size,
    changelog,
    isLatest
  });

  if (completeResult.success) {
    updateUploadProgress(100, "上传完成，版本已发布");
    setTimeout(() => hideUploadProgress(), 800);
  } else {
    hideUploadProgress();
  }

  return completeResult;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
