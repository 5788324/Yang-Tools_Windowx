# HANDOFF

最后更新：2026-05-24 18:55

## 当前状态

- 仓库：`5788324/Yang-Tools_Windowx`
- 本地路径：`D:\codex\Yang Agent_Windows\Yang-Tools_Windowx`
- 当前阶段：Electron/Vue 桌面壳与插件兼容桥雏形已创建
- 代码状态：可以安装依赖、类型检查、构建
- 产品名称：`Yang Tools`

## 已完成

- 确认 GitHub 仓库可访问，当前为空仓库。
- 克隆仓库到本地工作区。
- 读取用户桌面上的 `MyToolbox-完整开发文档.md`。
- 确认本机 ZTools 插件目录：

  ```text
  C:\Users\YANG\AppData\Roaming\ZTools\plugins
  ```

- 发现 6 个本地 ZTools 插件样本：
  - `calculation-paper`
  - `clipboard`
  - `easy-translate`
  - `file-renamer`
  - `shortcut-capture`
  - `url-wizard`
- 读取 uTools 插件目录：

  ```text
  C:\Users\YANG\AppData\Roaming\uTools\plugins
  ```

- 复制 ZTools/uTools 原始插件样本到本地样本库：

  ```text
  local-plugin-library/
  ```

- 注意：`local-plugin-library/` 已加入 `.gitignore`，用于本机适配分析，不提交第三方插件源码。
- 解析 uTools `remote` 索引，发现 97 个插件元信息。
- 创建 Yang Tools Electron + Vue + TypeScript 最小工程。
- 实现插件样本扫描器：
  - 读取 `local-plugin-library/ztools/*/plugin.json`
  - 读取 `local-plugin-library/utools/remote`
  - 统一输出 `PluginSummary`
- 实现 preload 安全桥：
  - `window.yangTools.getAppInfo()`
  - `window.yangTools.listPluginSamples()`
- 实现首个 Vue 界面：展示 ZTools/uTools 样本数量、功能数量、插件列表、触发类型标签。
- 实现托盘基础能力：
  - 托盘图标
  - 显示主窗口
  - 隐藏主窗口
  - 退出应用
- 实现全局快捷键基础能力：
  - 默认 `Alt+Space`
  - 切换主窗口显示/隐藏
- 实现主窗口行为：
  - 点击关闭按钮时隐藏到托盘
  - 应用保持后台运行
  - 第二实例启动时聚焦主窗口
- 实现最小插件窗口管理器：
  - 当前只支持打开 `local-plugin-library/ztools/*/plugin.json` 中的展开目录样本
  - uTools `.asar` 暂时显示“待适配”
- 实现插件专用 preload：
  - 构建产物：`out/preload/plugin.mjs`
  - 注入 `window.yangTools`
  - 注入 `window.ztools`
  - 注入 `window.utools`
  - 注入 `window.features`
- 修正 preload 路径解析，兼容 electron-vite 输出的 `.mjs`。
- 实现基础兼容 API：
  - `onPluginEnter`
  - `onMainPush` 占位
  - `setSubInput`
  - `subInputFocus`
  - `db.get/set/put/remove/allDocs`
  - `clipboard.readText/writeText`
  - `showNotification`
  - `shellOpenExternal`
  - `registerTool`
- 新增兼容 API 文档：

  ```text
  docs/PLUGIN_COMPAT_API.md
  ```
- 新增样本分析脚本：

  ```powershell
  npm.cmd run lint:manifests
  ```

- 生成分析结果：

  ```text
  docs/plugin-analysis/sample-summary.md
  docs/plugin-analysis/sample-summary.json
  ```

## ZTools 样本观察

- 插件 manifest 多数是 uTools/ZTools 风格 `plugin.json`。
- 常见字段：`name`、`pluginName`、`title`、`main`、`preload`、`logo`、`features`、`platform`、`pluginSetting`、`tools`。
- 触发类型包含：
  - 字符串关键词
  - `regex`
  - `over`
  - `img`
  - `files`
- 部分插件依赖 `window.ztools` API：
  - `onPluginEnter`
  - `setSubInput`
  - `subInputFocus`
  - `registerTool`
  - `clipboard.search`
  - `clipboard.getHistory`
  - `showNotification`

## 未完成

- 尚未实现完整插件运行时。
- 尚未实现完整 ZTools/uTools 兼容层。
- 尚未实现 uTools `.asar` 解包和兼容分析脚本。
- 尚未实现插件权限系统。
- 尚未实现插件安装/卸载/更新。
- 尚未复制或迁移本机 ZTools 插件为可运行插件。
- UI 只是第一个工程界面，不是最终视觉稿。

## 阻塞/风险

- ZTools 插件 preload 中可能直接使用 `require("electron")`、`fs`、`path`、`ipcRenderer` 等能力。直接运行会有安全风险。
- uTools 插件多为 `.asar` 包，当前环境没有 `asar` 解包工具。后续可在 Node 工程里安装 `@electron/asar` 做只读分析。
- 第三方插件版权/许可证未知，不要提交原始插件源码到公开仓库。
- `easy-translate` 自带 preload 目录和依赖，兼容复杂度高。
- `shortcut-capture` 涉及截图编辑器窗口、多显示器、DPI 和文件/剪贴板能力，是高风险适配样本。
- 当前兼容桥仍是 MVP：没有加载第三方插件自己的 preload，也不开放 `fs`、`child_process`、完整 Electron API。
- PowerShell 直接执行 `npm` 会被脚本策略拦截，请使用 `npm.cmd`。
- npm 默认缓存目录无权限，安装依赖时使用：

  ```powershell
  npm.cmd install --cache .\.npm-cache
  ```

## 下一位 AI 从这里开始

1. 先运行：

   ```powershell
   cd "D:\codex\Yang Agent_Windows\Yang-Tools_Windowx"
   git status --short --branch
   ```

2. 如果文档还未提交，先提交并推送。
3. 运行验证：

   ```powershell
   npm.cmd install --cache .\.npm-cache
   npm.cmd run typecheck
   npm.cmd run build
   npm.cmd run lint:manifests
   ```

4. 下一步建议优先让 `calculation-paper` 成为第一个完整验收插件。
5. 再实现权限声明和插件安装/卸载。

## 最近验证

- 已读取 ZTools 插件目录清单。
- 已读取 6 个插件的 `plugin.json`。
- 已读取 `clipboard/preload.js` 和 `shortcut-capture/preload.js` 片段。
- 已复制本地插件样本到 `local-plugin-library/`。
- 已解析 uTools remote 索引：97 个插件。
- `npm.cmd install --cache .\.npm-cache` 成功。
- `npm.cmd run typecheck` 成功。
- `npm.cmd run build` 成功。
- `npm.cmd run lint:manifests` 成功，生成插件样本分析。
- 新增托盘/快捷键/插件窗口后再次验证：
  - `npm.cmd run typecheck` 成功
  - `npm.cmd run build` 成功
  - `npm.cmd run lint:manifests` 成功
- 新增插件兼容桥后再次验证：
  - `npm.cmd run typecheck` 成功
  - `npm.cmd run build` 成功
  - `npm.cmd run lint:manifests` 成功
