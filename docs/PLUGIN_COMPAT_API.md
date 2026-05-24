# 插件兼容 API

本文记录 Yang Tools 当前为 ZTools/uTools 样本插件注入的兼容 API。它是过渡层，不等于最终完整插件协议。

## 注入对象

插件窗口会注入：

```ts
window.yangTools
window.ztools
window.utools
window.features
```

其中 `window.ztools` 和 `window.utools` 是兼容别名，内部走受控 IPC，不给插件直接开放完整 Node.js 权限。

## 当前支持

### 插件进入参数

```ts
window.ztools.onPluginEnter((payload) => {
  console.log(payload.code, payload.type, payload.payload)
})
```

当前从插件列表打开时：

- `code`: `open`
- `type`: `manual`
- `from`: `sample-list`

### 基础信息

```ts
window.ztools.getAppName()
window.ztools.getAppVersion()
window.ztools.isWindows()
window.ztools.isMacOS()
window.ztools.isLinux()
window.ztools.getPluginInfo()
window.ztools.copyText(text)
```

### 数据存储

当前使用浏览器 `localStorage`，按插件 ID 加前缀隔离：

```ts
window.ztools.db.get(key)
window.ztools.db.set(key, value)
window.ztools.db.put(doc)
window.ztools.db.remove(keyOrDoc)
window.ztools.db.allDocs(prefix)
```

这只是 MVP 存储，后续应迁移到主进程数据库，并加入数据导出/清理。

### 剪贴板

```ts
await window.ztools.clipboard.readText()
await window.ztools.clipboard.writeText(text)
window.ztools.copyText(text)
```

以下接口已占位，但还没有真实历史数据：

```ts
await window.ztools.clipboard.search(query)
await window.ztools.clipboard.getHistory(page, pageSize)
```

### 通知与外部链接

```ts
await window.ztools.showNotification(title, body)
await window.ztools.shellOpenExternal(url)
```

### 子输入框与工具注册

```ts
window.ztools.setSubInput(callback, placeholder)
window.ztools.subInputFocus()
window.ztools.registerTool(name, handler)
window.ztools.getRegisteredTools()
```

这些接口目前主要用于避免旧插件启动时报错。真正的主窗口子输入框和 AI tool registry 后续再接入。

## 暂不支持

- 插件自己的 preload 文件。
- 直接 `require("fs")`、`require("electron")`、`child_process`。
- 文件读写/重命名。
- 截图、钉图、屏幕选区。
- 剪贴板图片/文件历史。
- uTools `.asar` 直接运行。
- 完整 `onMainPush` 搜索结果回推。

## 下一步

1. 将插件数据存储迁移到主进程。
2. 实现文件、图片、选中文本触发 payload。
3. 实现权限声明和安装确认。
4. 为 `calculation-paper` 做第一个完整兼容验收。
5. 再逐步适配剪贴板、网址精灵、截图等高复杂度样本。
