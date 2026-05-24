# uTools 插件兼容计划

用户提供了本机 uTools 插件目录，后续可以参考这些插件实现 Yang Tools 的插件协议和兼容层。

## 本机路径

```text
C:\Users\YANG\AppData\Roaming\uTools\plugins
```

## 本地样本库

原始样本已复制到：

```text
local-plugin-library/utools
```

这个目录只用于本机分析，已加入 `.gitignore`，不要提交第三方插件源码到公开仓库。

## 当前目录观察

uTools 本地插件主要由以下几类文件组成：

- `.asar` 插件包
- `.asar.unpacked` 目录
- `remote` 插件索引
- `installs` 安装信息文件

当前环境没有可用的 asar 解包工具，后续 Node 工程初始化后建议安装 `@electron/asar`，做只读解包和 manifest 提取。

## remote 索引

已成功解析 `remote` 文件：

- 插件数量：97
- Last-Modified：`Sat, 23 May 2026 18:00:00 GMT`
- Hash：`2c1469ddd70afc7d760b7ff5b9e1e79af8d400d692ef56b47ae8f700e9b6b16e`

索引中可直接读取每个插件的：

- `name`
- `pluginName`
- `logo`
- `platform`
- `features`
- `features[].code`
- `features[].explain`
- `features[].cmds`

## 值得优先参考的插件类型

| 类型 | 示例插件 | 对 Yang Tools 的价值 |
|---|---|---|
| OCR | `OCR 文字识别`、`OCR Pro` | 首批自研 OCR 插件参考 |
| 截图/标图 | `兔灵截图工具`、`轻快标图`、`Photor - 截图美化` | 截图、钉图、标注、图片编辑参考 |
| 翻译/AI | `AI 助手` | AI Agent 和选中文本触发参考 |
| 文件处理 | `PDF 处理`、`批量重命名`、`图片批量处理` | 文件触发、批处理、安全权限参考 |
| 开发工具 | `JSON 编辑器`、`JSON Tools`、`Ctool`、`正则编辑器` | 搜索框正则触发和轻工具参考 |
| 快开工具 | `网页快开`、`网址精灵`、`腾讯会议助手` | URL/会议号/外部应用启动参考 |

## 需要兼容的 uTools 触发类型

uTools 和 ZTools 的触发结构高度相似，应抽象为统一 `CommandMatcher`：

- 字符串关键词
- `regex`
- `over`
- `img`
- `files`

还需要支持这些约束：

- `minLength`
- `maxLength`
- `minNum`
- `maxNum`
- `fileType`
- `extensions`
- `match`
- `exclude`
- `platform`

## 兼容 API 草案

Yang Tools 原生对象：

```ts
window.yangTools
```

兼容对象：

```ts
window.utools
window.ztools
```

第一阶段不追求完整 uTools API，只做常用能力：

- 插件进入参数
- 剪贴板读写
- 通知
- 数据存储
- 打开外部链接
- 文件选择/文件触发参数
- 图片触发参数
- 子输入框

## 解包与分析计划

1. 安装只读 asar 工具：

   ```powershell
   npm install -D @electron/asar
   ```

2. 编写脚本：

   ```text
   scripts/analyze-utools-plugins.ts
   ```

3. 输出分析结果到：

   ```text
   docs/plugin-analysis/utools-summary.json
   docs/plugin-analysis/utools-summary.md
   ```

4. 只提交分析结果，不提交第三方插件源码。

## 适配建议

先参考 uTools/ZTools 的 manifest 和触发规则，不急于直接运行 `.asar` 插件。Yang Tools 第一版应先拥有自己的稳定插件协议，再逐步兼容旧插件。

