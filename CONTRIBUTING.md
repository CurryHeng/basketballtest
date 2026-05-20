# 🤝 贡献指南

感谢你有兴趣为篮球球星资料库做出贡献！

---

## 📸 贡献图片

### 需要的图片

目前以下球星的图片需要补充：

| 类型 | 说明 |
|------|------|
| 头像照片 | 400x400px 以上，清晰的球员正面照 |
| 动作GIF | 球员的招牌动作，如投篮、扣篮、运球等 |

### 贡献方式

#### 方式一：在线提交（推荐）

1. 访问网站：[贡献图片页面](./contribute.html)
2. 选择需要补充图片的球星
3. 填写图片URL（需先上传到图床）
4. 点击"创建Issue"提交

#### 方式二：Pull Request

1. Fork 本仓库
2. 将图片放入对应目录：
   - 头像：`images/球星名_profile.jpg`
   - 动作GIF：`gifs/球星名_action.gif`
3. 更新 `data/players.json` 中的图片路径
4. 提交 Pull Request

#### 方式三：提交Issue

直接在 [Issues](https://github.com/CurryHeng/basketball/issues) 中提交：

```
标题：贡献图片 - 球星名称

内容：
- 球星：Joel Embiid
- 类型：头像照片
- 图片URL：https://xxx.com/embiid.jpg
```

---

## 🖼️ 图片要求

### 头像照片

- **格式**：JPG、PNG
- **尺寸**：建议 400x400px 或更大
- **内容**：清晰的球员正面照或官方照片
- **来源**：需为免费可商用图片

### 动作GIF

- **格式**：GIF
- **尺寸**：建议 600x400px
- **内容**：球员的招牌动作（投篮、扣篮、运球等）
- **时长**：3-5秒循环
- **来源**：需为免费可商用素材

---

## 🔗 推荐图床

上传图片到以下免费图床，获取链接：

| 图床 | 地址 | 特点 |
|------|------|------|
| ImgBB | https://imgbb.com | 免费、永久保存 |
| Imgur | https://imgur.com | 免费、速度快 |
| GitHub | 直接上传到本仓库 | 永久保存 |

---

## 📝 数据贡献

### 更新球员信息

如需更新球员数据（如荣誉、身高等）：

1. 编辑 `data/players.json`
2. 保持JSON格式正确
3. 提交 Pull Request

### 数据格式

```json
{
  "id": 1,
  "name": "Stephen Curry",
  "nickname": "萌神",
  "team": "Golden State Warriors",
  "teamAbbr": "GSW",
  "position": "Point Guard",
  "height": "6'2\" (188 cm)",
  "weight": "185 lbs (84 kg)",
  "honors": "2x MVP, 4x NBA Champion...",
  "profileImage": "images/curry_profile.jpg",
  "actionGif": "gifs/curry_shoot.gif",
  "actionDescription": "招牌超远距离三分投篮..."
}
```

---

## 🎨 代码贡献

### 开发环境

```bash
# 克隆仓库
git clone https://github.com/CurryHeng/basketball.git

# 安装后端依赖（可选）
pip install flask flask-cors

# 启动前端（使用 Live Server）
# 或直接打开 index.html
```

### 代码规范

- HTML：语义化标签，保持缩进一致
- CSS：使用项目已有变量，避免重复
- JS：添加必要注释，变量命名清晰
- Python：遵循 PEP 8 规范

### 提交规范

```
feat: 添加新功能
fix: 修复bug
docs: 更新文档
style: 代码格式调整
refactor: 代码重构
```

---

## ✅ 贡献检查清单

提交前请确认：

- [ ] 图片来源合法，可免费商用
- [ ] 图片质量清晰，尺寸合适
- [ ] JSON格式正确（可用在线工具验证）
- [ ] 本地测试通过
- [ ] 提交信息清晰

---

## 📧 联系方式

如有问题，可以：

- 提交 [Issue](https://github.com/CurryHeng/basketball/issues)
- 发起 [Discussion](https://github.com/CurryHeng/basketball/discussions)

---

## 🙏 致谢

感谢所有贡献者的付出！

贡献者名单将在这里更新：
<!-- ALL-CONTRIBUTORS-LIST:START -->
<!-- ALL-CONTRIBUTORS-LIST:END -->

---

## 📜 许可证

本项目采用 MIT 许可证，贡献的代码和资源将同样适用。
