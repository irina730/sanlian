# 三练

一周三练的力量训练记录 App（网页 App，可以装到手机主屏幕，离线可用）。
训练记录只保存在手机浏览器里，不会上传到任何地方。

## 上线（GitHub Pages，免费）

1. 打开 https://github.com/new ，Repository name 填 `sanlian`，选 Public，点 Create repository。
2. 在新仓库页面点 **uploading an existing file**。
3. 打开电脑上的 `sanlian-app` 文件夹，全选里面的所有文件和文件夹，拖进网页，点 **Commit changes**。
4. 进入仓库的 **Settings → Pages**：Source 选 **Deploy from a branch**，Branch 选 **main**、文件夹选 **/(root)**，点 **Save**。
5. 等 1–2 分钟，网址就是 `https://你的GitHub用户名.github.io/sanlian/`。

## 装到手机

**iPhone**：用 Safari 打开网址 → 点底部分享按钮 → 添加到主屏幕 → 添加。
要从主屏幕图标打开，不要从 Safari 里打开，两边的数据是分开的。

**安卓**：用 Chrome 打开网址 → 右上角三个点 → 添加到主屏幕（或“安装应用”）。

## 备份

在 App 里点右上角齿轮 → 备份，把文件存到“文件”App 或 iCloud。
换手机、删掉 App 或清除 Safari 数据之前一定要备份，否则记录会丢失。
换手机后：齿轮 → 恢复，选择备份文件。

## 以后更新 App

把改过的文件重新上传到 GitHub，并把 `sw.js` 第一行的版本号加 1（比如 `sanlian-v2`）。
手机上关掉再打开 App 两次就会更新，训练记录不受影响。

## 文件说明

- `data.js`：三天计划和动作说明
- `app.js`：功能和界面
- `style.css`：样式
- `sw.js`：离线缓存
- `img/`：从计划图裁出的动作插图
