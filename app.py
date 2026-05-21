# -*- coding: utf-8 -*-
"""
Flask主应用 - 篮球天赋分析后端
极简轻量化设计，方便二次开发
"""

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))

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
)
from backend.talent_analyzer import analyze_talent

app = Flask(__name__)

CORS(app, resources={
    r"/api/*": {
        "origins": "*",
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type"]
    }
})

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
