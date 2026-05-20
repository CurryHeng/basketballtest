# 部署指南

## 第一步：GitHub Pages（前端静态页面）

1. 打开 GitHub 仓库：https://github.com/CurryHeng/basketballtest
2. 进入 **Settings** → **Pages**
3. **Source** → **Deploy from branch**
4. **Branch** → `master`，目录 `/ (root)` → **Save**
5. 等 1-2 分钟，访问 `https://curryheng.github.io/basketballtest/`

✅ 球星浏览、搜索筛选、图片搜索等功能都能用了

---

## 第二步：Render（后端 API）— 研究好了再弄

等你想启用天赋分析和排行榜时，再部署后端：

1. 访问 https://dashboard.render.com → **New +** → **Web Service**
2. 连接仓库 `CurryHeng/basketballtest`
3. Name: `basketball-api`，Plan: **Free**
4. Build Command: `pip install -r requirements.txt`
5. Start Command: `gunicorn app:app`
6. 部署完成后，把 Render URL 填到 `js/main.js` 的第 9 行

```javascript
// 改前
: 'http://127.0.0.1:5000';  // ← 部署 Render 后替换

// 改后
: 'https://basketball-api.onrender.com';
```

提交推送即可生效。

---

## 本地开发

```bash
pip install -r requirements.txt
python app.py              # 后端
# 前端用 Live Server 打开 index.html
```

## 添加新功能

```bash
git add .
git commit -m "加了个新功能"
git push                     # GitHub Pages 自动更新
```
