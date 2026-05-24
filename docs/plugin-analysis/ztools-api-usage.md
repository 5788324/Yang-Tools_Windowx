# ZTools API 使用分析

来源：`local-plugin-library/ztools`。该文件只记录 API 名称，不包含第三方插件源码。

| 插件 | ztools API | db API | utools API |
|---|---|---|---|
| calculation-paper | copyText, db, getAppName, isMacOS, onMainPush, onPluginEnter | allDocs, put, remove | - |
| clipboard | clipboard, onPluginEnter, registerTool, setSubInput, subInputFocus | - | - |
| easy-translate | http | - | copyImage, getPath, onPluginEnter, screenCapture, showOpenDialog, showSaveDialog |
| file-renamer | - | - | - |
| shortcut-capture | copyImage, createBrowserWindow, dbStorage, getCursorScreenPoint, getDisplayNearestPoint, getPath, hideMainWindow, outPlugin, screenCapture, sendToParent, shellShowItemInFolder, showNotification, showSaveDialog | - | - |
| url-wizard | - | - | isLinux, isMacOS, onPluginEnter, shellOpenExternal |