# 天才猫软件中心

天才猫软件中心是一个面向客户的软件下载、产品介绍和文章发布站点。项目基于 Cloudflare Pages / Workers、R2 和 D1 构建，适合部署在 GitHub + Cloudflare 的静态站点工作流中。

## 功能概览

| 模块 | 说明 |
| --- | --- |
| 首页展示 | 轮播展示产品界面、产品能力、下载入口、精选文章和授权入口。 |
| 下载中心 | 按分类展示软件，读取后台维护的软件、版本、安装包和更新说明。 |
| 文章系统 | 支持文章新建、编辑、删除、草稿、发布、隐藏、封面图、摘要、正文和关联软件。 |
| 文章前台 | 提供文章列表、精选文章、详情阅读页、相关软件推荐和优雅阅读排版。 |
| 后台管理 | 管理软件、分类、版本上传、R2 存储授权、导航和文章内容。 |
| R2 文件存储 | 安装包、manifest、文章图片等文件存放在 Cloudflare R2。 |
| D1 数据库 | 文章数据优先写入 D1；未绑定 D1 时可回退到 R2 catalog。 |

## 技术架构

```text
GitHub Repository
        |
        v
Cloudflare Pages
        |
        |-- public/                  静态页面、样式、前端脚本
        |-- functions/               Pages Functions API
        |-- Cloudflare R2            安装包、manifest、图片、catalog
        |-- Cloudflare D1            文章表和文章关联表
```

核心目录：

```text
DownloadSite/
  public/                         # 前台页面和后台页面
  functions/                      # Cloudflare Pages Functions
  functions/_lib/articles-db.js   # D1 文章数据访问层
  schema.sql                      # D1 文章表结构
  docs/manifest.example.json      # 示例版本清单
  wrangler.toml                   # Wrangler / Worker 配置
  package.json                    # Wrangler 脚本
```

## 页面与入口

| 地址 | 用途 |
| --- | --- |
| `/` | 首页，展示产品、精选文章和主要入口。 |
| `/download.html` | 下载中心，展示软件分类和版本下载。 |
| `/articles.html` | 文章列表页。 |
| `/article.html?slug=文章标识` | 文章详情页。 |
| `/license.html` | 授权说明页。 |
| `/lvtuang` | 后台管理入口。 |
| `/download/latest` | 下载默认最新版。 |
| `/download/latest/:software` | 下载指定软件最新版。 |
| `/download/:id` | 按版本 ID 下载安装包。 |

## 环境变量和绑定

Cloudflare Pages 需要配置以下变量和绑定。

| 名称 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `SOFTWARE_BUCKET` | R2 bucket binding | 是 | 存放安装包、manifest、catalog、文章图片。 |
| `DB` | D1 database binding | 推荐 | 文章系统数据库绑定；不绑定时文章会回退到 R2 catalog。 |
| `ADMIN_PASSWORD` | Environment variable | 是 | 后台管理密码。 |
| `ADMIN_TOKEN_SECRET` | Secret / Environment variable | 推荐 | 后台登录 token 签名密钥；不填时回退使用 `ADMIN_PASSWORD`。 |
| `STORAGE_SECRET` | Secret / Environment variable | 是 | 外部 R2 存储授权加密密钥；未配置时不能保存或读取外部存储 Secret。 |
| `MANIFEST_KEY` | Environment variable | 是 | manifest 文件路径，默认 `releases/manifest.json`。 |
| `PRODUCT_NAME` | Environment variable | 可选 | 产品名称，当前为 `天才猫直播数据管理`。 |

推荐值：

```text
SOFTWARE_BUCKET = dy-ldms-downloads
DB = dy-ldms-download-db
ADMIN_PASSWORD = 自己设置一个强密码
ADMIN_TOKEN_SECRET = 自己设置一个长随机字符串
STORAGE_SECRET = 自己设置另一个长随机字符串
MANIFEST_KEY = releases/manifest.json
PRODUCT_NAME = 天才猫直播数据管理
```

## 推荐部署方式：GitHub + Cloudflare Pages

### 1. 准备 GitHub 仓库

如果仓库根目录就是 `DownloadSite`，Cloudflare Pages 的 Root directory 留空。

如果仓库包含整个 `D:\AI\dy`，Cloudflare Pages 的 Root directory 填：

```text
DownloadSite
```

### 2. 创建 Pages 项目

进入 Cloudflare Dashboard：

```text
Workers & Pages -> Create -> Pages -> Connect to Git
```

选择 GitHub 仓库后，构建配置如下：

```text
Framework preset: None
Build command: npm install
Build output directory: public
Root directory: DownloadSite   # 仓库根目录已经是 DownloadSite 时留空
```

### 3. 创建 R2 bucket

进入 Cloudflare Dashboard：

```text
R2 Object Storage -> Create bucket
```

Bucket 名称建议：

```text
dy-ldms-downloads
```

然后在 Pages 项目里添加 R2 绑定：

```text
Settings -> Functions -> R2 bucket bindings
```

配置：

```text
Variable name: SOFTWARE_BUCKET
R2 bucket: dy-ldms-downloads
```

### 4. 创建 D1 数据库

进入 Cloudflare Dashboard：

```text
Workers & Pages -> D1 SQL Database -> Create
```

数据库名称建议：

```text
dy-ldms-download-db
```

然后在 Pages 项目里添加 D1 绑定：

```text
Settings -> Functions -> D1 database bindings
```

配置：

```text
Variable name: DB
D1 database: dy-ldms-download-db
```

### 5. 初始化 D1 表结构

本地已登录 Wrangler 时，执行：

```powershell
cd D:\AI\dy\DownloadSite
npm install
npx wrangler d1 execute dy-ldms-download-db --file .\schema.sql --remote
```

也可以在 Cloudflare D1 控制台里打开数据库，进入 SQL Console，粘贴 `schema.sql` 内容执行。

当前表结构包含：

```text
articles           # 文章主表
article_software   # 文章和软件关联表
```

### 6. 配置环境变量

进入 Pages 项目：

```text
Settings -> Environment variables
```

添加：

```text
ADMIN_PASSWORD = 后台管理密码
MANIFEST_KEY = releases/manifest.json
PRODUCT_NAME = 天才猫直播数据管理
```

修改变量或绑定后，需要重新部署一次 Pages。

### 7. 上传初始 manifest

可以用 Wrangler 上传示例 manifest：

```powershell
cd D:\AI\dy\DownloadSite
npx wrangler r2 object put dy-ldms-downloads/releases/manifest.json --file .\docs\manifest.example.json
```

也可以在 Cloudflare R2 控制台手动上传到：

```text
releases/manifest.json
```

### 8. 部署并访问

推送到 GitHub 后，Cloudflare Pages 会自动部署。

部署完成后访问：

```text
https://你的-pages项目.pages.dev/
https://你的-pages项目.pages.dev/download.html
https://你的-pages项目.pages.dev/articles.html
https://你的-pages项目.pages.dev/lvtuang
```

后台登录使用 `ADMIN_PASSWORD`。

## 本地开发

安装依赖：

```powershell
cd D:\AI\dy\DownloadSite
npm install
```

启动 Wrangler 开发服务：

```powershell
npm run dev
```

验证部署配置，不真正发布：

```powershell
npm run deploy -- --dry-run
```

## Worker 方式部署

如果不用 Pages，也可以用 Worker 方式部署。

先登录 Cloudflare：

```powershell
npx wrangler login
```

创建 R2 bucket：

```powershell
npx wrangler r2 bucket create dy-ldms-downloads
```

创建 D1 数据库：

```powershell
npx wrangler d1 create dy-ldms-download-db
```

把返回的 `database_id` 填入 `wrangler.toml`：

```toml
[[d1_databases]]
binding = "DB"
database_name = "dy-ldms-download-db"
database_id = "你的-database-id"
```

初始化表结构：

```powershell
npx wrangler d1 execute dy-ldms-download-db --file .\schema.sql --remote
```

设置后台密码：

```powershell
npx wrangler secret put ADMIN_PASSWORD
```

发布：

```powershell
npm run deploy
```

## 后台使用说明

访问：

```text
/lvtuang
```

后台支持以下管理功能：

| 功能 | 说明 |
| --- | --- |
| 软件管理 | 新建软件、设置分类、封面、描述、上下架状态。 |
| 分类管理 | 管理数据中心、直播辅助、工具插件等分类。 |
| 版本上传 | 上传安装包到 R2，维护版本号、更新说明和最新版。 |
| 存储授权 | 配置外部 R2 存储授权，便于扩展多存储。 |
| 导航设置 | 修改前台顶部导航。 |
| 文章管理 | 新建、编辑、删除文章，设置草稿/发布/隐藏状态。 |

文章编辑支持：

```text
标题、slug、摘要、封面图、正文、关联软件、排序、状态
```

正文支持普通文本和简单 HTML。普通文本会自动按段落排版；HTML 可以使用：

```html
<h2>小标题</h2>
<p>段落内容</p>
<ul><li>列表项</li></ul>
<blockquote>重点说明</blockquote>
<img src="/media/example.jpg" alt="">
```

## 版本和安装包更新

每次发布新版本建议流程：

1. 准备新版 zip 安装包。
2. 登录后台 `/lvtuang`。
3. 进入版本上传。
4. 选择软件、填写版本号、更新说明。
5. 上传安装包。
6. 勾选是否设为最新版。

也可以使用命令上传：

```powershell
npx wrangler r2 object put dy-ldms-downloads/releases/DyDataCenter.App.zip --file D:\AI\dy\DataCenterPublishOut.zip
```

manifest 字段说明：

| 字段 | 说明 |
| --- | --- |
| `latest` | 当前默认最新版 release id。 |
| `releases[].id` | 版本 ID，用于 `/download/:id`。 |
| `releases[].key` | R2 对象路径。 |
| `releases[].fileName` | 客户下载时看到的文件名。 |
| `releases[].sha256` | 可选，安装包校验值。 |

## 部署后检查清单

部署完成后建议依次检查：

1. 首页能正常打开，轮播图、产品区、精选文章区正常显示。
2. `/download.html` 能看到软件列表。
3. `/articles.html` 能看到已发布文章。
4. `/lvtuang` 能用 `ADMIN_PASSWORD` 登录。
5. 后台可以保存文章，文章能在前台列表和详情页显示。
6. 上传安装包后，下载按钮能正常下载。
7. Cloudflare Pages 的 Functions 绑定里能看到 `SOFTWARE_BUCKET` 和 `DB`。

如果文章保存成功但前台不显示，优先检查：

```text
1. 文章状态是否为 published
2. Pages 是否绑定了 D1 变量 DB
3. D1 是否执行了 schema.sql
4. 是否重新部署了 Pages
```

## 常见问题

### 后台提示密码错误或未配置

检查 Pages 环境变量是否设置：

```text
ADMIN_PASSWORD
```

设置后重新部署。

### 文章没有进入 D1

检查 Pages Functions 绑定是否有：

```text
DB
```

如果没有绑定，系统会回退到 R2 catalog，不会使用 D1。

### 下载接口返回 R2 未配置

检查 R2 bucket binding：

```text
SOFTWARE_BUCKET
```

变量名必须完全一致。

### dry-run 看不到 DB 绑定

`wrangler.toml` 中的 D1 配置目前是注释状态。Worker 部署需要取消注释并填入 `database_id`；Pages 部署则以 Cloudflare Dashboard 的 Pages Functions 绑定为准。

## 推荐维护方式

- 页面和后台代码通过 GitHub 提交，交给 Cloudflare Pages 自动部署。
- 安装包和图片放 R2。
- 文章数据放 D1。
- 后台密码只放 Cloudflare 环境变量，不写入仓库。
- 每次大改后先执行 `npm run deploy -- --dry-run` 验证。
