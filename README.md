# 天才猫下载站

这是一个给客户下载软件的 Cloudflare Pages/Workers + R2 站点。

## 推荐架构

- 前台下载页：Cloudflare Pages 静态资源，或 Cloudflare Worker 静态资源。
- 安装包存储：Cloudflare R2。
- 下载路由：Pages Functions 或 Worker 从 R2 读取并返回文件。
- 后台上传：可以用 Cloudflare Dashboard、`wrangler r2 object put`，或单独部署 R2 Explorer 做管理后台。
- VPS：暂时不放在下载链路上，以后只建议用于授权、订单、客服后台等动态业务。

## 目录

```text
DownloadSite/
  public/              # 下载站静态页面
  functions/           # Cloudflare Pages Functions
  src/worker.js        # Worker 下载接口
  docs/manifest.example.json
  wrangler.toml        # Cloudflare 配置
```

## 方案 A：GitHub + Cloudflare Pages 部署

这是推荐给你网页操作的方式。

### 1. 上传到 GitHub

可以只上传 `DownloadSite` 这个目录，也可以把整个项目上传到 GitHub。

如果只上传 `DownloadSite`：

- 仓库根目录就是 `public/`、`functions/`、`package.json` 这些文件。
- Cloudflare Pages 的 Root directory 留空。

如果上传整个 `D:\AI\dy`：

- Cloudflare Pages 的 Root directory 填：`DownloadSite`

### 2. Cloudflare Pages 创建项目

Cloudflare Dashboard：

```text
Workers & Pages -> Create -> Pages -> Connect to Git
```

选择你的 GitHub 仓库后，配置：

```text
Framework preset: None
Build command: npm install
Build output directory: public
Root directory: DownloadSite   # 如果仓库根目录就是 DownloadSite，这里留空
```

### 3. 绑定 R2

进入 Pages 项目：

```text
Settings -> Functions -> R2 bucket bindings
```

添加绑定：

```text
Variable name: SOFTWARE_BUCKET
R2 bucket: dy-ldms-downloads
```

再添加环境变量：

```text
MANIFEST_KEY = releases/manifest.json
```

然后重新部署一次 Pages。

### 4. 创建 R2 bucket 和上传文件

Cloudflare Dashboard：

```text
R2 Object Storage -> Create bucket
```

Bucket 名称：

```text
dy-ldms-downloads
```

上传：

```text
releases/tiancaimao-datacenter-1.0.0.zip
releases/manifest.json
```

注意：R2 网页上传时，需要先进 bucket，创建/进入 `releases` 路径，再上传文件。也可以用 `wrangler r2 object put`。

### 5. 访问地址

部署完成后：

```text
https://你的-pages项目.pages.dev/
https://你的-pages项目.pages.dev/download/latest
```

`/download/latest` 会读取 R2 的 `manifest.json`，下载当前最新版本。

## 方案 B：Wrangler Worker 部署

如果以后 OAuth 或 API Token 可用，也可以用 Worker 方式部署。

1. 安装依赖：

```powershell
cd D:\AI\dy\DownloadSite
npm install
```

2. 登录 Cloudflare：

```powershell
npx wrangler login
```

3. 创建 R2 bucket：

```powershell
npx wrangler r2 bucket create dy-ldms-downloads
```

4. 上传安装包：

```powershell
npx wrangler r2 object put dy-ldms-downloads/releases/DyDataCenter.App.zip --file D:\AI\dy\DataCenterPublishOut.zip
```

5. 上传版本清单：

```powershell
npx wrangler r2 object put dy-ldms-downloads/releases/manifest.json --file .\docs\manifest.example.json
```

6. 发布 Worker：

```powershell
npm run deploy
```

## 更新版本

每次发新版本时：

1. 把新版安装包压缩成 zip。
2. 上传到 R2 的 `releases/` 目录。
3. 修改并上传 `manifest.json`。
4. 网站无需重新部署，会自动读取新清单。

也可以用内置脚本自动打包和生成清单：

```powershell
cd D:\AI\dy\DownloadSite
.\scripts\Prepare-Release.ps1 -Version 1.0.0 -SourceDir ..\DataCenterPublishOut
```

脚本会输出两条 `wrangler r2 object put` 命令，直接复制执行即可。

脚本会默认排除发布目录里的 `DataCenter` 运行数据，避免把本地客户数据、截图和临时文件一起打包。

## manifest 字段

- `latest`：当前最新版的 release id。
- `releases[].key`：R2 里的对象路径。
- `releases[].fileName`：客户下载时看到的文件名。
- `releases[].sha256`：建议填写，方便客户校验。

## 可选后台

如果你想要一个类似网盘的 R2 管理界面，可以单独部署 R2 Explorer，并用 Cloudflare Access 保护后台域名。客户下载站继续使用本目录，后台管理和客户下载分开，比较稳。
