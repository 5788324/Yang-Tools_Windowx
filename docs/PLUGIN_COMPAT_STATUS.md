# 插件兼容状态

这份文档记录本机插件样本的适配优先级和当前状态。

## 状态说明

- `planned`：已列入计划，尚未开始。
- `api-ready`：基础 API 已覆盖，但还未人工运行验收。
- `blocked`：需要高风险或尚未实现能力。
- `verified`：已人工运行并确认核心功能可用。

## ZTools 样本

| 插件 | 状态 | 当前判断 | 下一步 |
|---|---|---|---|
| `calculation-paper` | `api-ready` | 需要的 API 较少：`getAppName`、`isMacOS`、`onPluginEnter`、`onMainPush`、`copyText`、`db.allDocs/remove/put`。兼容桥已覆盖。 | 运行应用，打开插件，验证计算、保存稿纸、删除稿纸。 |
| `clipboard` | `blocked` | 需要剪贴板历史：`clipboard.search`、`clipboard.getHistory`。当前只有占位。 | 先实现剪贴板历史存储。 |
| `easy-translate` | `blocked` | 自带复杂 preload、网络请求、多个翻译服务和图片翻译。 | 等权限系统和网络配置完成后再适配。 |
| `file-renamer` | `blocked` | 需要文件触发和文件重命名权限。 | 实现文件触发 payload、权限确认、批量文件操作 API。 |
| `shortcut-capture` | `blocked` | 需要截图、图片读写、多窗口编辑器、Electron API。 | 先做自研截图/钉图插件，再考虑兼容。 |
| `url-wizard` | `blocked` | 需要文件读写、外部浏览器打开和插件私有 preload 能力。 | 先抽象受控文件 API。 |

## 当前第一个验收目标

`calculation-paper` 是第一个兼容验收目标，因为它不需要文件系统、截图或网络能力。

验收步骤：

1. 启动 Yang Tools：

   ```powershell
   npm.cmd run dev
   ```

2. 在插件样本列表中找到 `计算稿纸`。
3. 点击 `打开`。
4. 验证：
   - 插件窗口能打开。
   - 输入 `1+2` 能显示结果。
   - 保存稿纸不报错。
   - 打开“我的稿纸”能看到保存记录。
   - 删除稿纸不报错。

通过后将状态改为 `verified`。
