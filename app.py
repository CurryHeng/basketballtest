# -*- coding: utf-8 -*-
"""
Flask主应用 - 篮球天赋分析后端
极简轻量化设计，方便二次开发
"""

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import sys
import os
import re
import time
import json
import shutil

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))

import backend.database as db
from backend.database import (
    init_db,
    save_user_profile,
    save_talent_score,
    get_rankings,
    get_user_history,
    get_all_users,
    get_user_detail,
    create_user,
    verify_user,
    get_user_by_id,
    get_token_serializer,
    is_first_admin,
    get_all_users_admin,
    set_user_admin,
    delete_user_by_id,
    get_all_analyzes,
    delete_analyze_by_id,
    save_image_upload,
    get_player_images,
    get_all_uploads,
    delete_upload_by_id,
)
from backend.talent_analyzer import analyze_talent

app = Flask(__name__)

CORS(app, resources={
    r"/api/*": {
        "origins": "*",
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

# 上传配置
UPLOAD_FOLDER = os.path.join(ROOT_DIR, 'uploads')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
MAX_CONTENT_LENGTH = 5 * 1024 * 1024  # 5MB
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# WSGI 部署下自动初始化数据库（__main__ 分支只在 python app.py 时执行）
init_db()

@app.route('/')
def index():
    """首页 — 浏览器访问返回前端页面，API 请求返回 API 信息"""
    if request.accept_mimetypes.accept_json and not request.accept_mimetypes.accept_html:
        return jsonify({
            'message': '篮球天赋分析API',
            'version': '1.0.0',
            'endpoints': [
                'POST /api/analyze - 提交数据并分析天赋',
                'GET /api/rankings - 获取排行榜',
                'GET /api/users - 获取所有用户',
                'GET /api/user/<user_id> - 获取用户详情',
                'GET /api/history/<user_id> - 获取用户历史',
                'POST /api/auth/register - 注册',
                'POST /api/auth/login - 登录',
                'GET /api/auth/me - 当前用户信息',
            ]
        })
    return send_from_directory(ROOT_DIR, 'index.html')

@app.route('/<path:filename>')
def static_files(filename):
    """托管前端静态文件（js/css/images/data）"""
    if filename.startswith('api/'):
        return jsonify({'error': 'not found'}), 404
    filepath = os.path.join(ROOT_DIR, filename)
    if os.path.exists(filepath) and os.path.isfile(filepath):
        return send_from_directory(ROOT_DIR, filename)
    return jsonify({'error': 'not found'}), 404

@app.route('/api/analyze', methods=['POST', 'OPTIONS'])
def analyze():
    """
    核心接口：接收用户数据，分析天赋
    请求数据格式：
    {
        "nickname": "用户昵称",
        "height": 185,          // 身高cm
        "weight": 75,           // 体重kg
        "armSpan": 190,         // 臂展cm（可选）
        "verticalJump": 65,     // 原地弹跳cm（可选）
        "runningJump": 80,      // 助跑弹跳cm（可选）
        "position": "PG",       // 位置（可选）
        "playStyle": ["投射", "突破"]  // 打法风格（可选）
    }
    """
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'})
    
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': '请求数据为空'}), 400
        
        required_fields = ['height', 'weight']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'缺少必填字段: {field}'}), 400
        
        user_id = save_user_profile(data)
        
        result = analyze_talent(data)
        
        save_talent_score(user_id, result)
        
        return jsonify({
            'success': True,
            'userId': user_id,
            'result': result
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/rankings', methods=['GET'])
def rankings():
    """
    获取天赋排行榜
    参数: limit - 返回条数，默认10
    """
    try:
        limit = request.args.get('limit', 10, type=int)
        data = get_rankings(limit)
        return jsonify({
            'success': True,
            'data': data
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/users', methods=['GET'])
def users():
    """获取所有用户列表（用于双人对比选择）"""
    try:
        data = get_all_users()
        return jsonify({
            'success': True,
            'data': data
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/history/<int:user_id>', methods=['GET'])
def history(user_id):
    """获取用户历史记录"""
    try:
        data = get_user_history(user_id)
        return jsonify({
            'success': True,
            'data': data
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/user/<int:user_id>', methods=['GET'])
def user_detail(user_id):
    """获取用户完整详情（用于排行榜点击查看）"""
    try:
        data = get_user_detail(user_id)
        if data:
            return jsonify({
                'success': True,
                'data': data
            })
        else:
            return jsonify({'error': '用户不存在'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/video/upload', methods=['POST', 'OPTIONS'])
def video_upload():
    """
    预留接口：视频上传
    TODO: 后续可接入AI视觉识别
    """
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'})
    
    return jsonify({
        'success': False,
        'message': '视频上传功能开发中，敬请期待！',
        'hint': '此接口预留用于AI动作识别'
    })

@app.route('/api/images/upload', methods=['POST', 'OPTIONS'])
def image_upload():
    """
    上传球员图片
    multipart/form-data:
        file - 图片文件
        playerName - 球员名
        playerId - 球员ID
        imageType - profile 或 action
    """
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'})

    user_id = require_auth()
    if not user_id:
        return jsonify({'error': '请先登录'}), 401

    try:
        if 'file' not in request.files:
            return jsonify({'error': '请选择文件'}), 400

        file = request.files['file']
        player_name = (request.form.get('playerName') or '').strip()
        player_id = request.form.get('playerId', type=int)
        image_type = request.form.get('imageType', 'profile')

        if not player_name:
            return jsonify({'error': '请指定球员名称'}), 400

        if image_type not in ('profile', 'action'):
            return jsonify({'error': '图片类型必须是 profile 或 action'}), 400

        if not file.filename:
            return jsonify({'error': '请选择文件'}), 400

        if not allowed_file(file.filename):
            return jsonify({'error': '不支持的文件格式，仅支持 jpg/png/gif/webp'}), 400

        # 生成安全的文件名
        ext = file.filename.rsplit('.', 1)[1].lower()
        safe_name = re.sub(r'[^\w一-鿿\-]', '_', player_name.lower().replace(' ', '_'))
        filename = f"{safe_name}_{image_type}_{int(time.time())}.{ext}"
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        file.save(filepath)

        # 记录到数据库
        file_url = f"/uploads/{filename}"
        save_image_upload(player_name, player_id, image_type, file_url, file.filename, user_id)

        return jsonify({
            'success': True,
            'message': '上传成功',
            'url': file_url,
            'filename': filename
        })

    except Exception as e:
        return jsonify({'error': f'上传失败: {str(e)}'}), 500


@app.route('/api/images/<player_name>', methods=['GET'])
def get_images(player_name):
    """查询某个球员的所有已上传图片"""
    try:
        images = get_player_images(player_name)
        return jsonify({
            'success': True,
            'images': images,
            'count': len(images)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/duel/compare', methods=['POST', 'OPTIONS'])
def duel_compare():
    """
    预留接口：双人动作对比
    请求数据格式:
    {
        "user1Id": 1,
        "user2Id": 2
    }
    TODO: 后续可开发对比分析功能
    """
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'})
    
    try:
        data = request.get_json()
        
        return jsonify({
            'success': False,
            'message': '双人对比功能开发中，敬请期待！',
            'hint': '此接口预留用于双人天赋对比',
            'receivedData': data
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/config/templates', methods=['GET'])
def get_templates():
    """获取球星模板列表（方便前端展示）"""
    from backend.config.matching_rules import STAR_TEMPLATES_ACTIVE, STAR_TEMPLATES_FUN

    active = [{'name': t['name'], 'nickname': t['nickname'], 'position': t['position']}
              for t in STAR_TEMPLATES_ACTIVE]
    fun = [{'name': t['name'], 'nickname': t['nickname']}
           for t in STAR_TEMPLATES_FUN]

    return jsonify({
        'success': True,
        'active': active,
        'fun': fun
    })

# ── 认证接口 ──────────────────────────────────────────

from itsdangerous import BadSignature, SignatureExpired

def require_auth():
    """从请求头解析认证用户，返回 user_id 或 None"""
    auth = request.headers.get('Authorization', '')
    if not auth.startswith('Bearer '):
        return None
    token = auth[7:]
    try:
        data = get_token_serializer().loads(token, max_age=86400 * 7)  # 7 天有效期
        return data['user_id']
    except (BadSignature, SignatureExpired):
        return None

@app.route('/api/auth/register', methods=['POST', 'OPTIONS'])
def auth_register():
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'})
    try:
        data = request.get_json()
        username = (data.get('username') or '').strip()
        password = (data.get('password') or '').strip()
        email = (data.get('email') or '').strip()
        if not username or len(username) < 2:
            return jsonify({'error': '用户名至少2个字符'}), 400
        if not password or len(password) < 4:
            return jsonify({'error': '密码至少4个字符'}), 400
        user_id, err = create_user(username, email, password)
        if err:
            return jsonify({'error': err}), 409
        return jsonify({'success': True, 'userId': user_id})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/login', methods=['POST', 'OPTIONS'])
def auth_login():
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'})
    try:
        data = request.get_json()
        username = (data.get('username') or '').strip()
        password = (data.get('password') or '').strip()
        if not username or not password:
            return jsonify({'error': '请输入用户名和密码'}), 400
        user, token = verify_user(username, password)
        if not user:
            return jsonify({'error': token}), 401
        return jsonify({
            'success': True,
            'token': token,
            'user': {
                'id': user['id'],
                'username': user['username'],
                'email': user.get('email', ''),
                'isAdmin': bool(user.get('is_admin', 0))
            }
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/me', methods=['GET'])
def auth_me():
    user_id = require_auth()
    if not user_id:
        return jsonify({'error': '未登录或登录已过期'}), 401
    user = get_user_by_id(user_id)
    if not user:
        return jsonify({'error': '用户不存在'}), 404
    return jsonify({
        'success': True,
        'user': {
            'id': user['id'],
            'username': user['username'],
            'email': user.get('email', ''),
            'isAdmin': bool(user.get('is_admin', 0)),
            'createdAt': user.get('created_at', '')
        }
    })

# ── 管理员接口 ──────────────────────────────────────

def require_admin():
    """要求管理员权限，返回 user 或中断请求"""
    user_id = require_auth()
    if not user_id:
        return jsonify({'error': '未登录'}), 401
    user = get_user_by_id(user_id)
    if not user or not user.get('is_admin'):
        return jsonify({'error': '需要管理员权限'}), 403
    return user

@app.route('/api/admin/setup', methods=['POST'])
def admin_setup():
    """首次部署时设置第一个管理员（仅当尚无管理员时可调用）"""
    if not is_first_admin():
        return jsonify({'error': '管理员已存在'}), 403
    try:
        data = request.get_json()
        username = (data.get('username') or '').strip()
        password = (data.get('password') or '').strip()
        if not username or not password:
            return jsonify({'error': '请输入用户名和密码'}), 400
        user_id, err = create_user(username, '', password)
        if err:
            return jsonify({'error': err}), 409
        set_user_admin(user_id, True)
        return jsonify({'success': True, 'message': '管理员创建成功', 'userId': user_id})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/users', methods=['GET'])
def admin_users():
    resp = require_admin()
    if isinstance(resp, tuple):
        return resp
    users = get_all_users_admin()
    return jsonify({'success': True, 'users': users})

@app.route('/api/admin/user/<int:user_id>/set-admin', methods=['POST'])
def admin_set_admin(user_id):
    resp = require_admin()
    if isinstance(resp, tuple):
        return resp
    data = request.get_json()
    set_user_admin(user_id, data.get('isAdmin', True))
    return jsonify({'success': True})

@app.route('/api/admin/user/<int:user_id>', methods=['DELETE'])
def admin_delete_user(user_id):
    resp = require_admin()
    if isinstance(resp, tuple):
        return resp
    delete_user_by_id(user_id)
    return jsonify({'success': True})

@app.route('/api/admin/analyzes', methods=['GET'])
def admin_analyzes():
    resp = require_admin()
    if isinstance(resp, tuple):
        return resp
    analyzes = get_all_analyzes()
    return jsonify({'success': True, 'analyzes': analyzes})

@app.route('/api/admin/uploads', methods=['GET'])
def admin_uploads():
    """管理员查看所有上传图片"""
    resp = require_admin()
    if isinstance(resp, tuple):
        return resp
    uploads = get_all_uploads()
    return jsonify({'success': True, 'uploads': uploads})

@app.route('/api/admin/uploads/<int:upload_id>', methods=['DELETE'])
def admin_delete_upload(upload_id):
    """管理员删除上传图片"""
    resp = require_admin()
    if isinstance(resp, tuple):
        return resp
    file_path = delete_upload_by_id(upload_id)
    # 删除物理文件
    if file_path:
        full_path = os.path.join(ROOT_DIR, file_path.lstrip('/'))
        if os.path.exists(full_path):
            os.remove(full_path)
    return jsonify({'success': True})

@app.route('/api/admin/uploads/<int:upload_id>/approve', methods=['POST'])
def admin_approve_upload(upload_id):
    """管理员采用上传图片：复制到 images/ 或 gifs/ 并更新 players.json"""
    resp = require_admin()
    if isinstance(resp, tuple):
        return resp
    try:
        conn = db.get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM image_uploads WHERE id = ?", (upload_id,))
        row = cursor.fetchone()
        conn.close()
        if not row:
            return jsonify({'error': '记录不存在'}), 404

        upload = dict(row)
        src_path = os.path.join(ROOT_DIR, upload['file_path'].lstrip('/'))
        if not os.path.exists(src_path):
            return jsonify({'error': '文件不存在'}), 404

        # 确定目标目录和文件名
        player_slug = upload['player_name'].lower().replace(' ', '_')
        player_slug = re.sub(r'[^\w\-]', '_', player_slug)
        ext = upload['file_path'].rsplit('.', 1)[1].lower()

        if upload['image_type'] == 'profile':
            dest_dir = os.path.join(ROOT_DIR, 'images')
            dest_name = f"{player_slug}_profile.{ext}"
        else:
            dest_dir = os.path.join(ROOT_DIR, 'gifs')
            dest_name = f"{player_slug}_action.{ext}"

        os.makedirs(dest_dir, exist_ok=True)
        dest_path = os.path.join(dest_dir, dest_name)

        # 复制文件
        shutil.copy2(src_path, dest_path)
        relative_path = f"images/{dest_name}" if upload['image_type'] == 'profile' else f"gifs/{dest_name}"

        # 更新 players.json
        players_path = os.path.join(ROOT_DIR, 'data', 'players.json')
        if os.path.exists(players_path):
            with open(players_path, 'r', encoding='utf-8') as f:
                players = json.load(f)
            for p in players:
                if p['id'] == upload['player_id']:
                    if upload['image_type'] == 'profile':
                        p['profileImage'] = relative_path
                    else:
                        p['actionGif'] = relative_path
                    break
            with open(players_path, 'w', encoding='utf-8') as f:
                json.dump(players, f, indent=2, ensure_ascii=False)

        return jsonify({
            'success': True,
            'message': '已采用并更新球员数据',
            'path': relative_path
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/admin/analyze/<int:analyze_id>', methods=['DELETE'])
def admin_delete_analyze(analyze_id):
    resp = require_admin()
    if isinstance(resp, tuple):
        return resp
    delete_analyze_by_id(analyze_id)
    return jsonify({'success': True})

if __name__ == '__main__':
    print("=" * 50)
    print("篮球天赋分析后端启动")
    print("=" * 50)

    init_db()

    print("\n服务器地址: http://127.0.0.1:5000")
    print("API文档: http://127.0.0.1:5000/")
    print("\n按 Ctrl+C 停止服务器")
    print("=" * 50)

    app.run(host='0.0.0.0', port=5000, debug=True)
