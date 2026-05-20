# 部署指南

## 第一步：GitHub Pages（前端）

1. 打开 https://github.com/CurryHeng/basketballtest → **Settings** → **Pages**
2. **Source** → **Deploy from branch** → **Branch**: `master`, `/ (root)` → **Save**
3. 等 2 分钟，访问 `https://curryheng.github.io/basketballtest/`

## 第二步：Render（后端 API）— 约 3 分钟

> 前提：GitHub 仓库已设置好，`render.yaml` 已包含部署配置。

1. 打开 https://dashboard.render.com
2. 用 GitHub 账号登录
3. 点 **New +** → **Blueprint**
4. 选择仓库 `CurryHeng/basketballtest`
5. 点 **Apply** → 等 2 分钟部署完成
6. 访问 `https://basketball-api.onrender.com` 验证

部署后天赋分析和排行榜功能就都能用了。

## 以后加功能

```bash
git add .
git commit -m "添加了新功能"
git push
# GitHub Pages 自动更新前端
# Render 自动重新部署后端
```
