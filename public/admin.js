let password = sessionStorage.getItem("downloadAdminPassword") || "";
let catalog = null;
let articleSoftwareCategory = "all";
let articleSoftwareSelection = new Set();

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
byId("releaseForm").addEventListener("submit", uploadRelease);
byId("resetSoftware").addEventListener("click", resetSoftwareForm);
byId("resetCategory").addEventListener("click", resetCategoryForm);
byId("resetStorage").addEventListener("click", resetStorageForm);
byId("resetNavigation").addEventListener("click", resetNavigationForm);
byId("resetArticle").addEventListener("click", resetArticleForm);
byId("testStorage").addEventListener("click", testStorage);
byId("uploadArticleImage").addEventListener("click", () => uploadArticleImage("cover"));
byId("insertArticleImage").addEventListener("click", () => uploadArticleImage("content"));
byId("articleTitle").addEventListener("input", updateArticleEditorMeta);
byId("articleSummary").addEventListener("input", updateArticleEditorMeta);
byId("articleContent").addEventListener("input", updateArticleEditorMeta);
byId("articleCover").addEventListener("input", updateArticleEditorMeta);
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

if (password) {
  showApp();
  loadCatalog();
}

async function login() {
  password = byId("adminPassword").value.trim();
  if (!password) return toast("请输入管理员密码", true);
  const result = await api("/api/admin/catalog");
  if (!result.success) {
    password = "";
    return toast(result.msg || "登录失败", true);
  }
  sessionStorage.setItem("downloadAdminPassword", password);
  showApp();
  render(result.catalog);
  toast("登录成功");
}

function logout() {
  sessionStorage.removeItem("downloadAdminPassword");
  location.reload();
}

function showApp() {
  loginView.hidden = true;
  appView.hidden = false;
}

async function loadCatalog() {
  const result = await api("/api/admin/catalog");
  if (result.success) render(result.catalog);
  else toast(result.msg || "读取失败", true);
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
  byId("releaseStorage").innerHTML = `<option value="default">默认 R2：dy-ldms-downloads</option>${(catalog.storageAccounts || []).filter(item => item.status !== "disabled").map(item => `<option value="${escapeAttr(item.id)}">${escapeHtml(item.name)} / ${escapeHtml(item.bucket)}</option>`).join("")}`;
}

function renderArticleOptions() {
  const root = byId("articleSoftware");
  const categorySelect = byId("articleSoftwareCategory");
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
      tr.innerHTML = `<td>${escapeHtml(item.name)}</td><td>${escapeHtml(release.version)}</td><td class="code">${escapeHtml(release.fileName || "-")}<br><small>${escapeHtml(release.storageId || "default")}</small></td><td>${escapeHtml(release.size || "-")}</td><td>${release.isLatest ? "是" : "否"}</td><td>${release.downloadCount || 0}</td>`;
      rows.append(tr);
    }
  }
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
  resetArticleForm();
  render(result.catalog);
  toast("文章已保存");
}

async function uploadArticleImage(target) {
  const file = byId("articleImageFile").files[0];
  if (!file) return toast("请选择要上传的图片", true);
  const form = new FormData();
  form.append("password", password);
  form.append("file", file);
  toast("正在上传图片");
  const response = await fetch("/api/admin/article-image", { method: "POST", body: form });
  const result = await response.json();
  if (!result.success) return toast(result.msg || "图片上传失败", true);
  if (target === "cover") {
    byId("articleCover").value = result.url;
  } else {
    const textarea = byId("articleContent");
    const snippet = `\n<img src="${result.url}" alt="">\n`;
    const start = textarea.selectionStart || textarea.value.length;
    textarea.value = textarea.value.slice(0, start) + snippet + textarea.value.slice(start);
  }
  updateArticleEditorMeta();
  toast("图片已上传");
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
  const softwareId = byId("releaseSoftware").value;
  const version = byId("releaseVersion").value.trim();
  if (!softwareId || !version) return toast("请选择软件并填写版本号", true);

  const form = new FormData();
  form.append("password", password);
  form.append("softwareId", softwareId);
  form.append("storageId", byId("releaseStorage").value);
  form.append("version", version);
  form.append("changelog", byId("releaseChangelog").value.trim());
  form.append("isLatest", byId("releaseLatest").checked ? "1" : "0");
  form.append("file", file);

  toast("正在上传，请稍候");
  const response = await fetch("/api/admin/releases", { method: "POST", body: form });
  const result = await response.json();
  if (!result.success) return toast(result.msg || "上传失败", true);
  byId("releaseForm").reset();
  byId("releaseLatest").checked = true;
  render(result.catalog);
  toast("版本已发布");
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
  byId("articleId").value = item.id;
  byId("articleTitle").value = item.title;
  byId("articleSlug").value = item.slug;
  byId("articleSummary").value = item.summary || "";
  byId("articleCover").value = item.coverUrl || "";
  byId("articleContent").value = item.content || "";
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
  byId("articleForm").reset();
  byId("articleId").value = "";
  byId("articleSort").value = "10";
  articleSoftwareCategory = "all";
  articleSoftwareSelection.clear();
  renderArticleOptions();
  updateArticleEditorMeta();
  renderArticleRows();
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
}

function countWords(value) {
  const text = String(value || "").replace(/<[^>]+>/g, " ").trim();
  return text ? text.length : 0;
}

function articleStatusLabel(status) {
  return status === "published" ? "已发布" : status === "draft" ? "草稿" : "隐藏";
}

function articleStatusClass(status) {
  return status === "published" ? "active" : status === "draft" ? "draft" : "disabled";
}

function showPanel(id) {
  document.querySelectorAll(".tab-panel").forEach(panel => panel.hidden = panel.id !== id);
  document.querySelectorAll(".sidebar nav button").forEach(button => button.classList.toggle("is-active", button.dataset.panel === id));
}

async function api(url, payload = {}) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password, ...payload })
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

function formatDateTime(timestamp) {
  if (!timestamp) return "-";
  return new Date(timestamp).toLocaleString("zh-CN", { hour12: false });
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[char]);
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}
