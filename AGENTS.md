# AI 协作规则

本项目默认由多个 AI 工具接力开发，包括 Codex、Claude Code、Antigravity。任何 AI 或人类开发者开始工作前都必须先读本文件。

## 开始工作

1. 拉取最新仓库：

   ```powershell
   git fetch --all --prune
   git pull --ff-only
   ```

2. 阅读交接文档：

   ```powershell
   Get-Content -Raw docs/HANDOFF.md
   ```

3. 阅读当天工作日志。如果不存在，新建：

   ```text
   docs/worklogs/YYYY-MM-DD.md
   ```

4. 不确定现状时，先查看：

   ```powershell
   git status --short --branch
   git log --oneline -5
   ```

## 结束工作

每次结束前必须更新：

- `docs/HANDOFF.md`
- `docs/worklogs/YYYY-MM-DD.md`

交接日志必须说明：

- 当前分支和最后提交。
- 已完成内容。
- 未完成内容。
- 阻塞问题。
- 下一位 AI 应该从哪里继续。
- 哪些命令已经跑过，结果如何。

## 开发边界

- 不要删除用户已有文件，除非用户明确要求。
- 不要重写技术栈，除非已经记录到 `docs/DECISIONS/`。
- 插件必须走受控 API，不能直接把 Node.js 能力暴露给插件页面。
- 兼容 ZTools/uTools 插件时，优先做适配层，不直接修改第三方插件源码。
- 任何涉及文件删除、重命名、大规模移动的操作必须先说明。

## Windows 注意事项

- 本项目主要面向 Windows。
- 所有路径示例优先使用 PowerShell。
- 截图、钉图、多显示器、高 DPI 是重点测试项。

## 推荐输出格式

完成任务后说明：

- 修改了哪些文件。
- 解决了什么问题。
- 运行了哪些验证命令。
- 下一步建议。

