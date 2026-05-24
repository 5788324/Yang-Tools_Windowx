# Yang Tools 开发路线

## Phase 0：项目初始化

目标：让任何 AI 都能接手。

- 建立 README、AGENTS、CLAUDE。
- 建立工作日志和交接日志制度。
- 记录 ZTools 插件样本和兼容计划。
- 确定插件协议草案。

## Phase 1：桌面壳 MVP

目标：有一个能启动的 Windows 桌面应用。

- Electron + Vue + TypeScript 工程。
- 托盘常驻。
- 全局快捷键唤起主窗口。
- 主搜索框。
- 设置窗口。
- 本地配置存储。

## Phase 2：插件运行时 MVP

目标：可以加载插件并打开插件窗口。

- 扫描内置插件目录。
- 扫描用户插件目录。
- 解析 `plugin.json`。
- 搜索 `features[].cmds`。
- 打开插件 `main` 页面。
- 注入 `window.yangTools` 和 `window.ztools` 兼容对象。

## Phase 3：ZTools 样本兼容

目标：让本机已有插件逐个跑起来。

适配顺序：

1. 计算稿纸
2. 网址精灵
3. 剪贴板
4. 文件批量重命名
5. 截图
6. 易翻翻译

## Phase 3.5：uTools 样本分析

目标：从 uTools 插件生态中提取可复用的触发规则和插件协议经验。

- 保存本机 uTools 插件样本到 `local-plugin-library/utools`。
- 解析 `remote` 索引。
- 添加 asar 只读分析脚本。
- 提取常见 `plugin.json`/manifest。
- 整理 OCR、截图、翻译、文件处理插件的交互模式。
- 决定哪些插件做兼容运行，哪些只做参考重写。

## Phase 4：首批自研插件

目标：做出个人专属核心插件。

- 截图 + 钉图
- OCR
- 翻译
- 剪贴板历史

## Phase 5：插件市场与更新

目标：插件可以简单下载、安装、卸载、更新。

- 本地 zip 安装。
- 插件卸载。
- 插件启用/禁用。
- GitHub Releases 插件索引。
- 版本比较。
- 更新前备份、失败回滚。

## Phase 6：AI Agent / MCP

目标：让插件能力能被 AI 调用。

- 插件声明 `tools`。
- 将插件工具注册到本地 AI tool registry。
- 为 Codex/Claude/Antigravity 编写使用文档。
- 支持用户用自然语言让 AI 新增插件。
