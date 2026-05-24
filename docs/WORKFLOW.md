# 工作流程

这个项目会经常在 Codex、Claude Code、Antigravity 和新对话之间切换，所以交接流程比普通项目更重要。

## 开始工作流程

1. 进入仓库目录：

   ```powershell
   cd "D:\codex\Yang Agent_Windows\Yang-Tools_Windowx"
   ```

2. 拉取最新代码：

   ```powershell
   git fetch --all --prune
   git pull --ff-only
   ```

3. 阅读交接日志：

   ```powershell
   Get-Content -Raw docs/HANDOFF.md
   ```

4. 阅读最近工作日志：

   ```powershell
   Get-ChildItem docs/worklogs | Sort-Object Name -Descending | Select-Object -First 3
   ```

5. 查看当前状态：

   ```powershell
   git status --short --branch
   ```

## 结束工作流程

1. 运行能运行的检查命令。项目未初始化前至少运行：

   ```powershell
   git status --short
   ```

2. 更新当天日志：

   ```text
   docs/worklogs/YYYY-MM-DD.md
   ```

3. 更新交接日志：

   ```text
   docs/HANDOFF.md
   ```

4. 提交并推送：

   ```powershell
   git add .
   git commit -m "type: short summary"
   git push
   ```

## 工作日志模板

```markdown
# YYYY-MM-DD 工作日志

## 目标

- 

## 已完成

- 

## 修改文件

- 

## 验证

- 

## 问题/风险

- 

## 下一步

- 
```

## 交接日志模板

```markdown
# HANDOFF

## 当前状态

- 分支：
- 最后提交：
- 当前阶段：

## 已完成

- 

## 未完成

- 

## 阻塞/风险

- 

## 下一位 AI 从这里开始

1. 
2. 
3. 

## 最近验证

- 
```

