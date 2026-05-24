# Yang Tools Windowx

个人专属 Windows 桌面工具箱。目标是做一个类似 PowerToys Run、ZTools、uTools、PixPin 的轻量工具平台，但保持无账号、无付费、无臃肿、可被 AI 持续改造。

## 项目目标

- Windows 10/11 桌面常驻工具箱，托盘运行，全局快捷键唤起。
- 插件化架构，插件可安装、卸载、启用、禁用、更新。
- 优先支持 OCR、翻译、截图、钉图、剪贴板、批量重命名等个人效率插件。
- 兼容一批 ZTools/uTools 风格插件，降低已有插件迁移成本。
- 适配 Codex、Claude Code、Antigravity 等 AI 开发环境。
- 每次开发必须留下工作日志和交接日志，方便新对话、新 AI、上下文压缩后继续。

## 当前状态

仓库刚初始化。第一阶段先完成工程骨架、开发规范、交接机制和 ZTools 插件兼容设计。

已发现本机 ZTools 插件样本：

- `calculation-paper`
- `clipboard`
- `easy-translate`
- `file-renamer`
- `shortcut-capture`
- `url-wizard`

本地样本路径：

```text
C:\Users\YANG\AppData\Roaming\ZTools\plugins
```

## 核心原则

- 本地优先：默认不需要账号、云服务或会员系统。
- 插件隔离：插件只能通过受控 API 调用系统能力。
- AI 友好：文档、目录、日志、任务拆分都要方便 AI 接手。
- 小步交付：先做可运行 MVP，再逐步增强插件市场、自动更新和 AI Agent 能力。

## 重要文档

- [AGENTS.md](AGENTS.md)：所有 AI 协作者必须遵守的规则。
- [CLAUDE.md](CLAUDE.md)：Claude Code / Antigravity 友好开发提示。
- [docs/WORKFLOW.md](docs/WORKFLOW.md)：开始/结束工作流程。
- [docs/HANDOFF.md](docs/HANDOFF.md)：当前交接日志，任何新对话先读这里。
- [docs/ZTOOLS_COMPATIBILITY.md](docs/ZTOOLS_COMPATIBILITY.md)：ZTools 插件兼容计划。
- [docs/PLUGIN_SPEC.md](docs/PLUGIN_SPEC.md)：Yang Tools 插件协议草案。
- [docs/ROADMAP.md](docs/ROADMAP.md)：分阶段开发路线。

## 每次工作必做

开始工作：

```powershell
git fetch --all --prune
git pull --ff-only
Get-Content -Raw docs/HANDOFF.md
```

结束工作：

```powershell
git status --short
git add .
git commit -m "docs: initialize agent workflow"
git push
```

提交前必须更新：

- `docs/HANDOFF.md`
- `docs/worklogs/YYYY-MM-DD.md`

