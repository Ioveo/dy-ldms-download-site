const formatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
});

loadRelease();

async function loadRelease() {
  try {
    const response = await fetch("/api/releases", { cache: "no-store" });
    if (!response.ok) {
      throw new Error("manifest request failed");
    }

    const manifest = await response.json();
    const release = findLatest(manifest);
    if (!release) {
      return;
    }

    document.title = `${manifest.product || "天才猫"} - 下载中心`;
    byId("releaseName").textContent = release.name || "下载最新版";
    byId("releaseMeta").textContent = `${release.channel || "stable"} · ${release.date || formatter.format(new Date())}`;
    byId("versionText").textContent = release.version || "--";
    byId("fileText").textContent = [release.fileName, release.size].filter(Boolean).join(" · ") || "--";
    byId("hashText").textContent = release.sha256 || "上传后填写 SHA256，方便客户校验文件";
    byId("primaryDownload").href = `/download/${encodeURIComponent(release.id || "latest")}`;

    const noteList = byId("noteList");
    noteList.replaceChildren();
    for (const note of release.notes || []) {
      const item = document.createElement("li");
      item.textContent = note;
      noteList.append(item);
    }
  } catch {
    byId("releaseName").textContent = "下载清单暂未上传";
    byId("releaseMeta").textContent = "先把 manifest.json 上传到 R2，即可自动显示版本。";
  }
}

function findLatest(manifest) {
  const releases = Array.isArray(manifest.releases) ? manifest.releases : [];
  return releases.find(item => item.id === manifest.latest) || releases[0];
}

function byId(id) {
  return document.getElementById(id);
}
