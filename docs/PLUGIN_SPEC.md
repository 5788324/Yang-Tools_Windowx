# Yang Tools 插件协议草案

本协议参考 ZTools/uTools 的插件模型，并加入更严格的安全和 AI 友好要求。

## 插件目录

```text
plugins/
  example-plugin/
    plugin.json
    index.html
    preload.js
    logo.png
```

## plugin.json

```json
{
  "id": "example-plugin",
  "name": "example-plugin",
  "title": "示例插件",
  "description": "一个示例插件",
  "version": "1.0.0",
  "author": "Yang",
  "main": "index.html",
  "preload": "preload.js",
  "logo": "logo.png",
  "platform": ["win32"],
  "permissions": ["clipboard", "notification"],
  "features": [
    {
      "code": "open",
      "explain": "打开示例插件",
      "cmds": ["示例", "example"]
    }
  ]
}
```

## 字段说明

| 字段 | 必填 | 说明 |
|---|---|---|
| `id` | 推荐 | Yang Tools 内部唯一 ID。兼容 ZTools 时可由 `name` 推导 |
| `name` | 是 | 插件目录名或唯一名 |
| `title` | 推荐 | 展示名称 |
| `pluginName` | 兼容 | ZTools/uTools 展示名称 |
| `description` | 推荐 | 插件说明 |
| `version` | 是 | 语义化版本 |
| `main` | 是 | 插件入口 HTML |
| `preload` | 否 | 插件 preload |
| `logo` | 否 | 图标 |
| `features` | 是 | 可触发功能 |
| `permissions` | 推荐 | Yang Tools 权限声明 |

## Feature

```json
{
  "code": "translate",
  "explain": "翻译文字",
  "cmds": ["翻译", "translate"]
}
```

兼容对象形式：

```json
{
  "type": "regex",
  "label": "计算",
  "match": "/^\\d+\\+\\d+$/"
}
```

## 权限

建议权限名：

- `clipboard`
- `clipboard-history`
- `notification`
- `network`
- `screenshot`
- `pin-window`
- `file-read`
- `file-write`
- `file-rename`
- `shell-open`
- `db`
- `ai-tools`

## 插件 API

Yang Tools 原生对象：

```ts
window.yangTools
```

ZTools 兼容对象：

```ts
window.ztools
```

兼容对象只暴露安全包装后的能力。

