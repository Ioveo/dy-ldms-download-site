let password = sessionStorage.getItem("downloadAdminPassword") || "";
let catalog = null;

const loginView = byId("loginView");
const appView = byId("appView");

byId("loginButton").addEventListener("click", login);
byId("adminPassword").addEventListener("keydown", event => {
  if (event.key === "Enter") login();
});
byId("logoutButton").addEventListener("click", logout);
byId("softwareForm").addEventListener("submit", saveSoftware);
byId("categoryForm").addEventListener("submit", saveCategory);
byId("releaseForm").addEventListener("submit", uploadRelease);
byId("resetSoftware").addEventListener("click", resetSoftwareForm);
byId("resetCategory").addEventListener("click", resetCategoryForm);

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

function renderReleaseRows() {
  const rows = byId("releaseRows");
  rows.innerHTML = "";
  for (const item of catalog.software) {
    for (const release of item.releases) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${escapeHtml(item.name)}</td><td>${escapeHtml(release.version)}</td><td class="code">${escapeHtml(release.fileName || "-")}</td><td>${escapeHtml(release.size || "-")}</td><td>${release.isLatest ? "是" : "否"}</td><td>${release.downloadCount || 0}</td>`;
      rows.append(tr);
    }
  }
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

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[char]);
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}
