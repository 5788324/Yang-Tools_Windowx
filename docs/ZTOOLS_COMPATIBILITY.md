# ZTools 插件兼容计划

用户希望优先适配本机已有 ZTools 插件。兼容策略是：先做 manifest 和运行时桥接，再逐个插件验证，不直接修改第三方插件源码。

## 本机插件样本

路径：

```text
C:\Users\YANG\AppData\Roaming\ZTools\plugins
```

插件列表：

| 插件目录 | 名称 | 初步难度 | 原因 |
|---|---|---:|---|
| `calculation-paper` | 计算稿纸 | 低 | 主要是 `plugin.json`、`index.html`、`index.js`，触发规则较复杂但系统权限少 |
| `clipboard` | 剪贴板 | 中 | 使用 `window.ztools.clipboard`、`registerTool`、剪贴板历史 |
| `easy-translate` | 易翻翻译 | 高 | 自带 preload 目录、多翻译服务、图片翻译、依赖较多 |
| `file-renamer` | 文件批量重命名 | 中高 | 需要 files 触发、文件读写/重命名权限 |
| `shortcut-capture` | 截图 | 高 | 使用 Electron/Node API、截图编辑、多窗口、图片读写 |
| `url-wizard` | 网址精灵 | 中 | over/regex 触发、本地数据、网页打开能力 |

## 需要兼容的 manifest 字段

- `name`
- `pluginName`
- `title`
- `description`
- `author`
- `homepage`
- `version`
- `main`
- `preload`
- `logo`
- `platform`
- `pluginSetting`
- `features`
- `tools`
- `development`

## 需要兼容的触发类型

### 字符串关键词

```json
"cmds": ["截图", "sc"]
```

### 正则触发

```json
{
  "type": "regex",
  "label": "添加网址卡片",
  "match": "/^(http|https):\\\/\\\/"
}
```

### 文本选中/剪贴板触发

```json
{
  "type": "over",
  "label": "翻译"
}
```

### 图片触发

```json
{
  "type": "img",
  "label": "图片翻译"
}
```

### 文件触发

```json
{
  "type": "files",
  "fileType": "file",
  "maxLength": 100,
  "label": "批量重命名"
}
```

## 兼容 API 草案

插件内部可能调用 `window.ztools`。Yang Tools 需要在插件 preload 中注入兼容对象：

```ts
window.ztools = {
  onPluginEnter(callback),
  setSubInput(callback, placeholder),
  subInputFocus(),
  showNotification(message, type),
  registerTool(name, handler),
  clipboard: {
    readText(),
    writeText(text),
    search(query),
    getHistory(page, pageSize)
  },
  db: {
    get(key),
    set(key, value),
    remove(key)
  },
  shellOpenExternal(url),
  hideMainWindow(),
  outPlugin()
}
```

内部真实 API 应该叫 `window.yangTools`，`window.ztools` 只是兼容别名。

## 安全策略

- 默认不允许第三方插件直接 `require("electron")`。
- 对旧插件提供受限 CommonJS shim，而不是完整 Node 环境。
- 每个插件安装时生成权限清单。
- 文件操作、网络请求、剪贴板、截图、打开外部链接必须可审计。
- 高风险插件先以“兼容实验模式”运行。

## 适配顺序

1. `calculation-paper`：验证 manifest、regex/mainPush、无复杂权限插件。
2. `url-wizard`：验证 regex/over、本地数据、打开网页。
3. `clipboard`：验证剪贴板历史和 AI tool 注册。
4. `file-renamer`：验证 files 触发和文件权限确认。
5. `shortcut-capture`：验证截图/图片/编辑器窗口。
6. `easy-translate`：最后处理复杂翻译服务和图片翻译。

## 验收标准

- 插件能出现在插件列表。
- 插件关键词能被搜索到。
- `features[].cmds` 中的字符串和对象触发能正常匹配。
- 插件窗口能打开。
- 插件调用未授权 API 时给出明确错误。
- 卸载插件时不会删除用户数据，除非用户明确勾选清除数据。

