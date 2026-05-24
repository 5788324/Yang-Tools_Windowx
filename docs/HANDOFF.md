# HANDOFF

最后更新：2026-05-24 20:05

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

## 风险与限制

- 当前兼容桥不运行第三方插件自己的 preload，不开放 `fs`、`child_process`、完整 Electron API。
- 文本剪贴板历史是内存版，重启后清空；图片、文件历史还没有做。
- uTools 插件多为 `.asar`，还未做只读解包和兼容分析。
- 第三方插件源码版权未知，`local-plugin-library/` 只能本地分析，不能提交。
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
   - 插件权限声明和运行确认
   - 插件安装/卸载/更新目录结构
   - 自研截图/钉图 MVP
   - 自研 OCR MVP
