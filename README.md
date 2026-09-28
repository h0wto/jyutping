# 粵拼日日打

每天 5 分钟，用 iPhone 英文键盘练粤拼打字（不打声调）。给会讲广东话、会普通话拼音、只想学会打字的人用。

- 纯 HTML/CSS/JS，零依赖、不用构建，放在 GitHub Pages 就能用，装到主屏幕后可以离线使用
- 打完一个音节按空格才判题；打错时自动识别是哪种「普通话拼音习惯」（y→j、zh→z、io→oe、漏了 p/t/k……）并弹出对应的规则卡
- 11 个单元，排成一条小巴路线；每关按一次打对的比例给星（80% 过关，90% 两星，97% 三星）
- 错字进复习本，按 1/2/4/7/15 天的间隔自动混进之后的练习
- 正反馈：连击音阶、连击称号、每日 XP 圆环、连续打卡、速度纪录、三星彩纸

## 本地运行

```
node scripts/serve.mjs      # http://localhost:5173
npm test                    # 核心逻辑 + 词库一致性测试
node scripts/verify-data.mjs  # 对照 rime-cantonese 字表核对词库读音（字表放在 .cache/）
```

## 发布

推到 GitHub 仓库，在 Settings → Pages 里选 `main` 分支根目录。改了文件后把 `sw.js` 里的 `VERSION` 加一，手机上的离线缓存才会更新。

## 目录

- `src/data/units.js`：单元、关卡、词库
- `src/core/traps.js`：陷阱规则卡和识别规则
- `src/core/session.js`：一局练习的状态机（判题、重做、统计）
- `src/core/progress.js`：星级、XP、打卡、错题复习
- `src/app.js`：界面
- `src/ui/fx.js`：音效、彩纸、朗读
