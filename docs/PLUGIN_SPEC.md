# Yang Tools 插件协议草案

本协议参考 ZTools/uTools 的插件模型，但会加上更明确的权限、安装、卸载和 AI 交接要求。

## 插件安装目录

开发样本目录：

```text
local-plugin-library/
  ztools/
  utools/
```

该目录只用于本机分析，已加入 `.gitignore`，不要提交第三方插件源码。

Yang Tools 自己管理的已安装插件目录：

```text
{Electron app.getPath("userData")}/plugins/
  example-plugin/
    plugin.json
    index.html
    preload.js
    logo.png
```

当前安装来源只支持本机 ZTools 展开目录样本。后续下载市场、远程更新源、签名校验都会接在同一套 `plugins/` 目录模型上。

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
| `id` | 推荐 | Yang Tools 内部唯一 ID。兼容 ZTools 时可由 `name` 推导。 |
| `name` | 是 | 插件目录名或唯一名。 |
| `title` | 推荐 | 展示名称。 |
| `pluginName` | 兼容 | ZTools/uTools 展示名称。 |
| `description` | 推荐 | 插件说明。 |
| `version` | 是 | 语义化版本。 |
| `main` | 是 | 插件入口 HTML。 |
| `preload` | 否 | 插件 preload。当前不直接执行第三方 preload。 |
| `logo` | 否 | 图标。 |
| `features` | 是 | 可触发功能入口。 |
| `permissions` | 推荐 | Yang Tools 权限声明。 |

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

## 插件管理行为

- 安装：从样本目录复制到 `{userData}/plugins/{id}`。
- 更新：从同一来源覆盖 `{userData}/plugins/{id}`。
- 卸载：只删除 `{userData}/plugins/{id}` 内的受管理目录。
- 下载：暂未实现。后续需要远程索引、哈希校验、版本比较和下载失败回滚。

插件管理器必须限制所有文件操作在 `{userData}/plugins` 下，禁止路径越界。

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

兼容对象只暴露安全包装后的能力。当前兼容桥详见 [PLUGIN_COMPAT_API.md](PLUGIN_COMPAT_API.md)。
