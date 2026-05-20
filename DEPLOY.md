# 部署指南（简化版）

本项目已配置为 **前后端一体部署**，只需一个平台即可运行。

## Render 一键部署（推荐）

1. 访问 https://dashboard.render.com  → **New +** → **Web Service**
2. 连接你的 GitHub 仓库 `CurryHeng/basketballtest`
3. 按以下配置：

| 配置项 | 值 |
|--------|-----|
| Name | `basketball-api`（或任意名称） |
| Environment | `Python 3` |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `gunicorn app:app` |
| Plan | **Free**（够用） |

4. 点击 **Create Web Service**

部署完成后访问 `https://basketball-api.onrender.com` 即可。

> 注意：Render 免费版闲置 15 分钟会休眠，再次访问会延迟数秒唤醒。这是正常的。

## 本地开发

```bash
pip install -r requirements.txt
python app.py
# 访问 http://localhost:5000
```

## 添加新功能的工作流

```bash
# 1. 修改代码
# 2. 提交并推送
git add .
git commit -m "添加了新功能"
git push

# 3. Render 自动重新部署（约 1-2 分钟）
```

## 文件清单（需上传到 GitHub）

```
baskertball/
├── app.py                  # Flask 后端 + 前端托管
├── Procfile                # Render 部署配置
├── requirements.txt        # Python 依赖
├── index.html              # 首页
├── css/style.css           # 样式
├── js/main.js              # 前端逻辑
├── data/players.json       # 球星数据
├── backend/                # 后端逻辑
│   ├── database.py
│   ├── talent_analyzer.py
│   └── config/matching_rules.py
├── images/                 # 球星头像
└── gifs/                   # 动作 GIF
```
