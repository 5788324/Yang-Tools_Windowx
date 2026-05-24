# Yang Tools · AI 开发指南

你正在开发一个个人专属 Windows 桌面工具箱。用户是代码新手，主要依赖 AI 全程开发，所以你必须把工作拆清楚、写清楚、交接清楚。

## 项目定位

- 类似 PowerToys Run / ZTools / uTools / PixPin。
- 无账号、无付费、无会员限制。
- 插件化，核心保持轻量。
- 首批重点：截图/钉图、OCR、翻译、剪贴板、批量重命名。
- 需要兼容本机已有 ZTools 插件样本。
- 需要分析本机已有 uTools 插件样本，优先复用 manifest/触发规则思想。

## 推荐技术栈

- Electron + TypeScript
- Vue 3
- electron-vite
- Pinia
- SQLite 或轻量本地存储
- contextBridge + IPC 安全桥接

暂不使用 `@electron/remote`。全局快捷键优先用 Electron `globalShortcut`。

## 目录约定

```text
src/main/          主进程，只在这里访问系统能力
src/preload/       安全 API 桥接
src/renderer/      主界面和设置界面
plugins/           内置插件
plugin-template/   插件模板
docs/              项目文档
docs/worklogs/     每日工作日志
docs/DECISIONS/    架构决策记录
```

## ZTools 兼容目标

已有插件路径：

```text
C:\Users\YANG\AppData\Roaming\ZTools\plugins
```

uTools 插件路径：

```text
C:\Users\YANG\AppData\Roaming\uTools\plugins
```

本地样本库：

```text
local-plugin-library/
```

注意：`local-plugin-library/` 是本机分析样本，已加入 `.gitignore`，不要把第三方插件源码提交到公开仓库。

已发现插件：

- `calculation-paper`
- `clipboard`
- `easy-translate`
- `file-renamer`
- `shortcut-capture`
- `url-wizard`

兼容时优先支持：

- `plugin.json`
- `main`
- `preload`
- `logo`
- `features[].cmds`
- `features[].code`
- `features[].explain`
- `pluginName` / `title`
- `platform`
- `window.ztools.onPluginEnter`
- `window.ztools.setSubInput`
- `window.ztools.registerTool`
- `window.ztools.clipboard`
- 图片、文件、正则、over 触发类型

## 每次工作必须更新

- `docs/HANDOFF.md`
- `docs/worklogs/YYYY-MM-DD.md`

如果上下文快满，优先更新 `docs/HANDOFF.md`，让下一位 AI 能继续。
