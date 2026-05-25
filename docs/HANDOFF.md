# HANDOFF

最后更新：2026-05-25 20:10

## 当前状态

- 仓库：`5788324/Yang-Tools_Windowx`
- 本地路径：`D:\codex\Yang Agent_Windows\Yang-Tools_Windowx`
- 产品名称：`Yang Tools`
- 当前阶段：Electron/Vue 桌面壳、托盘、全局热键、插件样本扫描、ZTools/uTools 兼容桥 MVP 已建立。
- 第三方插件样本已复制到 `local-plugin-library/`，该目录已加入 `.gitignore`，不要提交原始插件源码。

## 已完成

- 初始化 Electron + Vue + TypeScript 工程。
- 实现主窗口、托盘菜单、`Alt+Space` 全局呼出、关闭隐藏到托盘。
- 复制并分析本机插件样本：
  - ZTools 样本：`calculation-paper`、`clipboard`、`easy-translate`、`file-renamer`、`shortcut-capture`、`url-wizard`
  - uTools `remote` 索引：97 个插件元信息
- 实现插件样本扫描器和分析脚本：
  - `npm.cmd run lint:manifests`
  - `docs/plugin-analysis/sample-summary.*`
  - `docs/plugin-analysis/ztools-api-usage.*`
- 实现插件窗口管理器，可打开 ZTools 展开目录样本。
- 实现插件专用 preload，注入：
  - `window.yangTools`
  - `window.ztools`
  - `window.utools`
  - `window.features`
- 实现 ZTools/uTools 兼容桥 MVP：
  - `onPluginEnter`
  - `onMainPush`
  - `setSubInput`
  - `subInputFocus`
  - `db.get/set/put/remove/allDocs`
  - `clipboard.readText/writeText/search/getHistory`
  - `copyText`
  - `showNotification`
  - `shellOpenExternal`
  - `registerTool`
- 实现 ZTools 命令匹配器，支持字符串关键字、`regex`、`over` 占位；输入 `1+2` 可匹配 `calculation-paper`。
- 主界面新增“运行匹配”入口，可带 `code/type/payload` 打开插件窗口。
- 新增内存版文本剪贴板历史管理器：
  - 文件：`src/main/clipboardHistoryManager.ts`
  - 轮询系统剪贴板文本
  - 支持 `window.ztools.clipboard.search(query)`
  - 支持 `window.ztools.clipboard.getHistory(page, pageSize)`
- 新增 Yang Tools 受管理插件目录：
  - 目录：`{Electron app.getPath("userData")}/plugins`
  - 文件：`src/main/managedPlugins.ts`
  - 支持从本机 ZTools 展开目录样本安装到 Yang Tools 插件目录
  - 支持更新覆盖已安装插件
  - 支持卸载已安装插件
  - 插件管理操作会限制在受管理目录内，避免路径越界
- 主界面从“插件样本”升级为“插件管理中心”：
  - 显示已安装、ZTools 样本、uTools 索引数量
  - 已安装插件可打开/卸载
  - ZTools 样本可安装/更新
  - uTools remote 索引仍显示为待适配
- 插件摘要新增权限字段：
  - manifest 中声明的 `permissions` 会进入 `PluginSummary.permissions`
  - 会根据触发类型和 manifest 文本推断 `clipboard`、`network`、`screenshot`、`file-read`、`file-write` 等基础权限
  - 主界面会显示权限标签，供后续运行确认弹窗使用
- 插件运行上下文新增权限字段：
  - `PluginLaunchContext.permissions`
  - 插件兼容 API 暴露 `getGrantedPermissions()`
  - 插件兼容 API 暴露 `hasPermission(permission)`
- 主界面新增插件运行前确认：
  - 点击插件“打开”时先弹出权限确认框
  - 点击“运行匹配”时也先弹出权限确认框
  - 确认后才调用 `openSamplePlugin`
- 新增插件信任状态：
  - 文件：`src/main/pluginTrustStore.ts`
  - 本地保存：`{Electron app.getPath("userData")}/plugin-trust.json`
  - 信任指纹包含 `source/id/version/permissions`
  - 插件版本或权限变化后会重新要求确认
  - 主界面默认勾选“记住此版本和权限组合”
- 新增兼容 API 权限拦截：
  - `clipboard.readText/writeText/copyText` 需要 `clipboard`
  - `clipboard.search/getHistory` 需要 `clipboard-history`
  - `showNotification` 需要 `notification`
  - `shellOpenExternal` 需要 `shell-open`
  - `registerTool` 需要 `ai-tools`
  - `db.*` 需要 `db`
- 本地 ZTools/Yang Tools 插件摘要会扫描插件源码关键字辅助推断权限，避免只看 manifest 导致误拦截。
- 已生成免安装测试包：
  - 文件夹：`D:\codex\Yang Agent_Windows\Yang-Tools_Windowx\release\Yang-Tools-0.1.0-portable`
  - 压缩包：`D:\codex\Yang Agent_Windows\Yang-Tools_Windowx\release\Yang-Tools-0.1.0-portable.zip`
  - 运行：双击 `Yang Tools.exe`
  - 已复制本机 `local-plugin-library` 到 `resources/local-plugin-library`，方便测试 ZTools 样本扫描、安装、打开
  - `release/` 已加入 `.gitignore`，不会提交到 GitHub

## 兼容状态

- `calculation-paper`：`api-ready`，还需要 GUI 人工验证。
- `clipboard`：`api-ready`，文本历史 API 已接入；图片/文件历史未实现，插件自己的第三方 preload 暂不执行。
- `easy-translate`：`blocked`，涉及网络、复杂 preload、多个翻译服务。
- `file-renamer`：`blocked`，需要文件触发、权限确认、批量文件写操作。
- `shortcut-capture`：`blocked`，建议先做自研截图/钉图插件，再考虑适配。
- `url-wizard`：`partial`，需要补齐打开链接、二维码、图片相关能力。

## 最新验证

以下命令已在 2026-05-24 20:05 左右通过：

```powershell
npm.cmd run typecheck
npm.cmd run build
npm.cmd run lint:manifests
```

新增插件管理中心后，以下命令已在 2026-05-24 20:35 左右再次通过：

```powershell
npm.cmd run typecheck
npm.cmd run build
npm.cmd run lint:manifests
```

2026-05-25 继续工作后，以下命令已再次通过：

```powershell
npm.cmd run typecheck
npm.cmd run lint:manifests
```

新增运行前确认弹窗后，`npm.cmd run typecheck` 已通过。

新增插件信任状态后，以下命令已通过：

```powershell
npm.cmd run typecheck
npm.cmd run build
npm.cmd run lint:manifests
```

新增兼容 API 权限拦截后，`npm.cmd run typecheck` 与 `npm.cmd run lint:manifests` 已通过。

生成免安装包前，`npm.cmd run build` 已通过。

## 风险与限制

- 当前兼容桥不运行第三方插件自己的 preload，不开放 `fs`、`child_process`、完整 Electron API。
- 插件下载市场还没有实现；当前只支持从本机 ZTools 样本安装/更新到 Yang Tools 受管理目录。
- 权限目前已用于界面展示、运行前确认、信任指纹和部分兼容 API 拦截。
- 文本剪贴板历史是内存版，重启后清空；图片、文件历史还没有做。
- uTools 插件多为 `.asar`，还未做只读解包和兼容分析。
- 第三方插件源码版权未知，`local-plugin-library/` 只能本地分析，不能提交。
- portable 包内包含本机复制的第三方插件样本，仅用于用户本机测试，不要上传公开仓库或公开分发。
- PowerShell 下使用 `npm.cmd`，不要直接使用 `npm`。

## 下一步建议

1. 每次开始先执行：

   ```powershell
   cd "D:\codex\Yang Agent_Windows\Yang-Tools_Windowx"
   git status --short --branch
   git pull --ff-only
   ```

2. 启动应用做人工验证：

   ```powershell
   npm.cmd run dev
   ```

3. 验证 `calculation-paper`：
   - 搜索框输入 `1+2`
   - 点击“运行匹配”
   - 打开“计算稿纸/计算”
   - 验证计算、保存稿纸、删除稿纸

4. 验证 `clipboard`：
   - 复制几段文本
   - 打开剪贴板插件
   - 验证文本历史和搜索

5. 下一轮开发优先级：
   - GUI 人工验证安装、更新、卸载、打开插件
   - 让用户运行 portable 包，GUI 人工验证信任状态、安装、更新、卸载、打开插件
   - 继续扩展截图、文件、网络等高风险 API 的权限模型
   - 远程下载索引、版本比较、哈希校验
   - 自研截图/钉图 MVP
   - 自研 OCR MVP
