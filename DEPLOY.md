# 部署指南

## 架构

```
用户 → Vercel（前端静态页面）
          ↓ 代理 /api/*
        Render（Flask 后端 API）
```

两者都免费，都连接 GitHub 自动部署。

---

## 1. Render — 部署后端 API

1. 访问 https://dashboard.render.com → **New +** → **Web Service**
2. 连接 GitHub 仓库 `CurryHeng/basketballtest`
3. 按以下配置：

| 配置项 | 值 |
|--------|-----|
| Name | `basketball-api` |
| Environment | `Python 3` |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `gunicorn app:app` |
| Plan | **Free** |

4. 点击 **Create Web Service**
5. 部署完成后，获得 URL 如 `https://basketball-api.onrender.com`

> 免费版闲置 15 分钟会休眠，再次访问会延迟几秒唤醒。

## 2. Vercel — 部署前端页面

1. 返回 Render，复制你的服务 URL（如 `https://basketball-api.onrender.com`）
2. 打开项目中的 `vercel.json`，把 `destination` 地址替换成你的 Render URL
3. 提交并推送代码：

```bash
git add vercel.json
git commit -m "更新 Render 后端地址"
git push
```

4. 访问 https://vercel.com → **Add New Project**
5. 导入 `CurryHeng/basketballtest`
6. 框架选 **Other**，直接 **Deploy**
7. 部署完成 → `https://basketballtest.vercel.app`

## 3. 验证

- 访问 Vercel 地址，页面正常显示
- 打开天赋分析，提交表单，确认能返回结果（第一次会慢几秒，因为 Render 在唤醒）
- 排行榜能加载数据

## 本地开发

```bash
pip install -r requirements.txt
python app.py          # 后端 → http://localhost:5000
# 前端用 Live Server 打开 index.html
```

`js/main.js` 已配置：本地开发时自动请求 `localhost:5000`，生产环境用空字符串（走 Vercel 代理）。

## 添加新功能

```bash
# 1. 改代码
# 2. 提交推送
git add .
git commit -m "新功能描述"
git push

# 3. 等待约 1 分钟，Vercel + Render 自动重新部署
```
