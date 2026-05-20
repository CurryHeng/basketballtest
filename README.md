# 篮球球星资料库 + 天赋分析系统

一个完整的篮球球星资料库，包含球星展示、天赋分析、图片搜索等功能。

[在线演示](https://curryheng.github.io/basketball/) | [贡献指南](./CONTRIBUTING.md) | [部署指南](./DEPLOY.md)

---

## ✨ 功能特性

| 功能 | 说明 |
|------|------|
| 🏀 球星资料库 | 30+ NBA球星详细资料，支持搜索筛选 |
| 🔍 图片搜索 | 从Unsplash等图库搜索下载球星图片 |
| 📊 天赋分析 | 输入身体数据，匹配NBA球星模板 |
| 🏆 排行榜 | 天赋评分排行，点击查看详情 |
| 🤝 贡献图片 | 支持用户上传贡献球星图片 |

---

## 项目结构

```
baskertball/
├── index.html              # 前端主页面
├── css/style.css           # 样式文件
├── js/main.js              # 前端逻辑
├── data/players.json       # 球星数据
├── images/                 # 球星头像
├── gifs/                   # 动作GIF
├── app.py                  # Flask后端入口
├── backend/
│   ├── database.py         # 数据库模型
│   ├── talent_analyzer.py  # 天赋分析逻辑
│   └── config/
│       └── matching_rules.py  # 匹配规则配置
└── requirements.txt        # Python依赖
```

---

## 快速启动（前端静态页面）

```bash
# 方式一：直接用浏览器打开（部分功能受限）
# 双击 index.html 即可浏览球星资料

# 方式二：Live Server（推荐，可完整使用搜索筛选）
# VS Code 中右键 index.html → Open with Live Server
```

## 天赋分析（需要后端）

天赋分析和排行榜功能需要 Flask 后端支持：

```bash
pip install -r requirements.txt
python app.py
```

然后在浏览器访问 http://127.0.0.1:5000 （后端 API 地址），并在 `js/main.js` 中配置后端地址。

---

## GitHub Pages 部署（免费）

1. 打开 GitHub 仓库 `CurryHeng/basketballtest`
2. 进入 **Settings** → **Pages**
3. **Source** 选 **Deploy from branch**
4. **Branch** 选 `master`，目录选 `/ (root)`
5. 点击 **Save**

等 1-2 分钟，访问 `https://curryheng.github.io/basketballtest/` 即可看到线上页面。

> 天赋分析功能需要部署 Render 后端后才能使用，详见 [部署指南](./DEPLOY.md)。

# 3. 打开前端（另一个终端，用 Live Server 或直接双击 index.html）
#    或使用 Vercel CLI: vercel dev
```

---

## 部署架构

```
用户浏览器 → Vercel（前端静态页面）
                ↓ 代理 /api/* 请求
              Render（Flask 后端 API）
```

## Vercel（前端）

1. 访问 https://vercel.com 用 GitHub 登录
2. **Add New Project** → 导入 `CurryHeng/basketballtest`
3. 框架选 **Other**，Vercel 会自动识别静态文件
4. 点击 **Deploy**，几秒后获得 `https://basketballtest.vercel.app`

> 已配置 `vercel.json`，Vercel 会自动把 `/api/*` 请求转发到 Render 后端。

## Render（后端）

1. 访问 https://dashboard.render.com  → **New +** → **Web Service**
2. 连接仓库 `CurryHeng/basketballtest`
3. 配置：

| 配置项 | 值 |
|--------|-----|
| Name | `basketball-api` |
| Environment | `Python 3` |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `gunicorn app:app` |
| Plan | **Free** |

4. 创建完成后，把 `vercel.json` 里的 `https://basketball-api.onrender.com` 替换成你实际的 Render 地址

> Render 免费版闲置 15 分钟会休眠，再次访问会延迟几秒唤醒

## 以后加功能

```bash
git add .
git commit -m "加了新功能"
git push          # GitHub 收到推送
                  # Vercel 自动重新部署前端
                  # Render 自动重新部署后端
```

---

## API 接口说明

### 1. 天赋分析接口

**POST** `/api/analyze`

请求示例：
```json
{
    "nickname": "小飞侠",
    "height": 185,
    "weight": 78,
    "armSpan": 190,
    "verticalJump": 70,
    "runningJump": 85,
    "position": "SG",
    "playStyle": ["投射", "突破"]
}
```

响应示例：
```json
{
    "success": true,
    "userId": 1,
    "result": {
        "matchedStar": "Kyrie Irving",
        "matchedStarActive": {
            "name": "Kyrie Irving",
            "nickname": "德鲁大叔",
            "description": "史诗级运球过人，德鲁大叔的街球艺术！"
        },
        "matchedStarFun": {
            "name": "花式运球王",
            "nickname": "街球手",
            "description": "动作花里胡哨，效果嘛...懂的都懂！"
        },
        "scores": {
            "shooting": 88,
            "speed": 90,
            "iq": 82,
            "handling": 95,
            "defense": 70
        },
        "comments": {
            "shooting": "投射能力在线，继续磨练能成大器！",
            "overall": "潜力股！综合评分 85.0，野球场称霸指日可待！"
        }
    }
}
```

### 2. 排行榜接口

**GET** `/api/rankings?limit=10`

### 3. 用户列表接口

**GET** `/api/users`

### 4. 用户历史接口

**GET** `/api/history/<user_id>`

### 5. 预留接口

- **POST** `/api/video/upload` - 视频上传（预留）
- **POST** `/api/duel/compare` - 双人对比（预留）

---

## 自定义配置

### 修改匹配规则

编辑 `backend/config/matching_rules.py`：

```python
# 添加新的球星模板
STAR_TEMPLATES_ACTIVE.append({
    "name": "新球星",
    "nickname": "绰号",
    "position": "PG",
    "height_range": (175, 195),
    "weight_range": (70, 95),
    "play_style": ["投射", "突破"],
    "scores": {"shooting": 90, "speed": 85, ...},
    "description": "描述文案"
})

# 修改评价文案
TALENT_COMMENTS["shooting"]["high"] = "新的文案..."
```

### 修改评分权重

```python
SCORING_WEIGHTS = {
    "height": 0.15,
    "weight": 0.10,
    "arm_span": 0.15,
    "vertical_jump": 0.20,
    "running_jump": 0.20,
    "play_style_match": 0.20
}
```

---

## 前后端对接（已同域）

前后端已通过 Flask 静态文件服务整合，`js/main.js` 中的 `API_BASE` 为空字符串，开发和生产环境均无需修改。

---

## 后期迭代预留

### 1. 组队功能

预留数据库表：
```sql
CREATE TABLE teams (
    id INTEGER PRIMARY KEY,
    name TEXT,
    members TEXT,  -- JSON格式存储成员ID
    created_at TIMESTAMP
);
```

预留接口：
- `POST /api/team/create` - 创建队伍
- `POST /api/team/join` - 加入队伍
- `GET /api/team/<id>` - 获取队伍信息

### 2. 小队战术功能

预留接口：
- `POST /api/tactics/create` - 创建战术
- `GET /api/tactics/list` - 获取战术列表

### 3. AI视觉识别

预留接口：
- `POST /api/video/upload` - 上传视频
- `POST /api/video/analyze` - 动作分析

---

## 常见问题

### Q: 后端无法启动？

A: 检查是否安装依赖：
```bash
pip install flask flask-cors
```

### Q: 前端无法连接后端？

A: 确保：
1. 后端已启动（`python app.py`）
2. 端口5000未被占用
3. 前端使用 Live Server 运行（不能直接双击HTML）

### Q: 如何修改球星模板？

A: 编辑 `backend/config/matching_rules.py` 中的 `STAR_TEMPLATES_ACTIVE` 列表

### Q: 数据存储在哪里？

A: SQLite数据库文件：`backend/data/basketball.db`

---

## 技术栈

- **前端**: HTML + CSS + JavaScript（纯原生）
- **后端**: Python Flask
- **数据库**: SQLite
- **跨域**: Flask-CORS

---

## 版本信息

- V1.0: 核心功能实现
  - 球星资料展示
  - 天赋分析匹配
  - 排行榜功能
  - 数据本地存储
