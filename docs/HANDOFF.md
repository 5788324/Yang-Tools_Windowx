# HANDOFF

最后更新：2026-05-24

## 当前状态

- 仓库：`5788324/Yang-Tools_Windowx`
- 本地路径：`D:\codex\Yang Agent_Windows\Yang-Tools_Windowx`
- 当前阶段：仓库初始化与架构/流程文档建立
- 代码状态：尚未生成 Electron 工程
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

- 尚未创建 Electron/Vue 工程。
- 尚未实现插件运行时。
- 尚未实现 ZTools 兼容层。
- 尚未实现 uTools `.asar` 解包和兼容分析脚本。
- 尚未复制或迁移本机 ZTools 插件。
- 尚未设计最终 UI。

## 阻塞/风险

- ZTools 插件 preload 中可能直接使用 `require("electron")`、`fs`、`path`、`ipcRenderer` 等能力。直接运行会有安全风险。
- uTools 插件多为 `.asar` 包，当前环境没有 `asar` 解包工具。后续可在 Node 工程里安装 `@electron/asar` 做只读分析。
- 第三方插件版权/许可证未知，不要提交原始插件源码到公开仓库。
- `easy-translate` 自带 preload 目录和依赖，兼容复杂度高。
- `shortcut-capture` 涉及截图编辑器窗口、多显示器、DPI 和文件/剪贴板能力，是高风险适配样本。

## 下一位 AI 从这里开始

1. 先运行：

   ```powershell
   cd "D:\codex\Yang Agent_Windows\Yang-Tools_Windowx"
   git status --short --branch
   ```

2. 如果文档还未提交，先提交并推送。
3. 创建 Electron + Vue + TypeScript 工程骨架。
4. 实现最小插件加载器，优先读取 ZTools `plugin.json` 和 uTools remote 索引并展示插件列表。
5. 做 `window.ztools` / `window.utools` 到 `window.yangTools` 的兼容桥，不要直接给插件开放完整 Node.js 权限。

## 最近验证

- 已读取 ZTools 插件目录清单。
- 已读取 6 个插件的 `plugin.json`。
- 已读取 `clipboard/preload.js` 和 `shortcut-capture/preload.js` 片段。
- 已复制本地插件样本到 `local-plugin-library/`。
- 已解析 uTools remote 索引：97 个插件。
