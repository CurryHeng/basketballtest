# 部署指南

## GitHub Pages（前端）

1. GitHub 仓库 **Settings → Pages**
2. **Source**: Deploy from branch → **Branch**: master, / (root) → Save
3. 访问 `https://curryheng.github.io/basketballtest/`

## PythonAnywhere（后端 API）

1. 注册 https://www.pythonanywhere.com
2. 打开 **Bash 控制台**：
   ```bash
   git clone https://github.com/CurryHeng/basketballtest.git
   cd basketballtest
   pip install -r requirements.txt --user
   ```
3. **Web** → **Add a new web app** → **Manual Configuration** → Python 3.10
4. 编辑 **WSGI configuration file**，内容：
   ```python
   import sys, os
   path = '/home/CurryHeng/basketballtest'
   if path not in sys.path:
       sys.path.append(path)
   from app import app as application
   ```
5. **Static files** 设置：

   | URL | Directory |
   |-----|-----------|
   | `/` | `/home/CurryHeng/basketballtest/` |

6. 点 **Reload**

后端地址：`https://CurryHeng.pythonanywhere.com`
