# -*- coding: utf-8 -*-
"""
数据库模型 - SQLite本地存储
"""

import sqlite3
import json
from datetime import datetime
from pathlib import Path
from werkzeug.security import generate_password_hash, check_password_hash
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired

DB_PATH = Path(__file__).parent.parent / "data" / "basketball.db"

def get_db():
    """获取数据库连接"""
    DB_PATH.parent.mkdir(exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """初始化数据库表"""
    conn = get_db()
    cursor = conn.cursor()
    
    # 用户身体素质数据表
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_profiles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nickname TEXT NOT NULL,
            height REAL NOT NULL,
            weight REAL NOT NULL,
            arm_span REAL,
            vertical_jump REAL,
            running_jump REAL,
            position TEXT,
            play_style TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # 天赋评分记录表
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS talent_scores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            matched_star TEXT,
            matched_star_active TEXT,
            matched_star_fun TEXT,
            scores TEXT,
            comments TEXT,
            version TEXT DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES user_profiles (id)
        )
    """)
    
    # 排行榜表
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS rankings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            total_score REAL NOT NULL,
            rank_type TEXT DEFAULT 'total',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES user_profiles (id)
        )
    """)
    
    # 预留：视频上传记录表
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS video_uploads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            video_path TEXT,
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES user_profiles (id)
        )
    """)
    
    # 预留：双人对比记录表
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS duel_comparisons (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user1_id INTEGER NOT NULL,
            user2_id INTEGER NOT NULL,
            comparison_data TEXT,
            winner_id INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user1_id) REFERENCES user_profiles (id),
            FOREIGN KEY (user2_id) REFERENCES user_profiles (id)
        )
    """)

    # 用户账号表
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT,
            password_hash TEXT NOT NULL,
            is_admin INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # 图片上传记录表
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS image_uploads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            player_name TEXT NOT NULL,
            player_id INTEGER,
            image_type TEXT NOT NULL,
            file_path TEXT NOT NULL,
            original_name TEXT,
            uploaded_by INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (uploaded_by) REFERENCES users (id)
        )
    """)

    # 球员提交审核表
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS player_submissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            name_cn TEXT,
            nickname TEXT,
            team TEXT,
            team_abbr TEXT,
            position TEXT,
            height TEXT,
            weight TEXT,
            honors TEXT,
            action_description TEXT,
            submitted_by INTEGER,
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (submitted_by) REFERENCES users (id)
        )
    """)

    conn.commit()
    conn.close()
    print("数据库初始化完成")

# ── 认证相关 ──────────────────────────────────────────

SECRET_KEY = "basketball-talent-secret-key-2024"

def get_token_serializer():
    return URLSafeTimedSerializer(SECRET_KEY, salt='auth')

def create_user(username, email, password):
    """注册新用户"""
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO users (username, email, password_hash)
            VALUES (?, ?, ?)
        """, (username, email, generate_password_hash(password)))
        conn.commit()
        user_id = cursor.lastrowid
        conn.close()
        return user_id, None
    except sqlite3.IntegrityError:
        conn.close()
        return None, '用户名已存在'

def verify_user(username, password):
    """验证用户登录，成功返回 (user, token)，失败返回 (None, 错误消息)"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE username = ?", (username,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None, '用户名或密码错误'
    if not check_password_hash(row['password_hash'], password):
        return None, '用户名或密码错误'
    user = dict(row)
    del user['password_hash']
    serializer = get_token_serializer()
    token = serializer.dumps({'user_id': user['id']})
    return user, token

def get_user_by_id(user_id):
    """根据 ID 获取用户信息"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, username, email, is_admin, created_at FROM users WHERE id = ?", (user_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

# ── 管理员相关 ──────────────────────────────────────

def is_first_admin():
    """检查是否还没有管理员"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) as c FROM users WHERE is_admin = 1")
    count = cursor.fetchone()['c']
    conn.close()
    return count == 0

def get_all_users_admin():
    """管理员获取所有用户"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT u.id, u.username, u.email, u.is_admin, u.created_at,
               COUNT(ts.id) as analyze_count
        FROM users u
        LEFT JOIN talent_scores ts ON u.id = ts.user_id
        GROUP BY u.id
        ORDER BY u.created_at DESC
    """)
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def set_user_admin(user_id, is_admin):
    """设置/取消管理员"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE users SET is_admin = ? WHERE id = ?", (1 if is_admin else 0, user_id))
    conn.commit()
    conn.close()

def delete_user_by_id(user_id):
    """删除用户及其所有分析数据"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM rankings WHERE user_id = ?", (user_id,))
    cursor.execute("DELETE FROM talent_scores WHERE user_id = ?", (user_id,))
    cursor.execute("DELETE FROM user_profiles WHERE id = ?", (user_id,))
    cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
    conn.commit()
    conn.close()

def get_all_analyzes():
    """管理员获取所有分析记录"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT ts.id, ts.user_id, u.username, ts.matched_star,
               ts.scores, ts.created_at
        FROM talent_scores ts
        LEFT JOIN users u ON ts.user_id = u.id
        ORDER BY ts.created_at DESC
        LIMIT 100
    """)
    rows = cursor.fetchall()
    conn.close()
    results = []
    for r in rows:
        s = json.loads(r['scores']) if r['scores'] else {}
        total = sum(s.values()) / len(s) if s else 0
        results.append({
            'id': r['id'],
            'userId': r['user_id'],
            'username': r['username'],
            'matchedStar': r['matched_star'],
            'totalScore': round(total, 1),
            'createdAt': r['created_at']
        })
    return results

def delete_analyze_by_id(analyze_id):
    """删除分析记录"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM talent_scores WHERE id = ?", (analyze_id,))
    conn.commit()
    conn.close()

def save_user_profile(data):
    """保存用户身体素质数据"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT INTO user_profiles 
        (nickname, height, weight, arm_span, vertical_jump, running_jump, position, play_style)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        data.get('nickname', '匿名球员'),
        data.get('height'),
        data.get('weight'),
        data.get('armSpan'),
        data.get('verticalJump'),
        data.get('runningJump'),
        data.get('position'),
        json.dumps(data.get('playStyle', []), ensure_ascii=False)
    ))
    
    user_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return user_id

def save_talent_score(user_id, result):
    """保存天赋评分结果"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT INTO talent_scores 
        (user_id, matched_star, matched_star_active, matched_star_fun, scores, comments, version)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        user_id,
        result.get('matchedStar'),
        json.dumps(result.get('matchedStarActive'), ensure_ascii=False),
        json.dumps(result.get('matchedStarFun'), ensure_ascii=False),
        json.dumps(result.get('scores'), ensure_ascii=False),
        json.dumps(result.get('comments'), ensure_ascii=False),
        'active'
    ))
    
    score_id = cursor.lastrowid
    
    # 更新排行榜
    total_score = sum(result.get('scores', {}).values()) / 5
    cursor.execute("""
        INSERT INTO rankings (user_id, total_score, rank_type)
        VALUES (?, ?, 'total')
    """, (user_id, total_score))
    
    conn.commit()
    conn.close()
    
    return score_id

def get_rankings(limit=10):
    """获取天赋排行榜"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT r.id, r.user_id, r.total_score, up.nickname, up.height, up.weight, up.position,
               r.created_at
        FROM rankings r
        JOIN user_profiles up ON r.user_id = up.id
        ORDER BY r.total_score DESC
        LIMIT ?
    """, (limit,))
    
    rows = cursor.fetchall()
    conn.close()
    
    rankings = []
    for i, row in enumerate(rows, 1):
        rankings.append({
            'rank': i,
            'userId': row['user_id'],
            'nickname': row['nickname'],
            'height': row['height'],
            'weight': row['weight'],
            'position': row['position'],
            'totalScore': round(row['total_score'], 1),
            'createdAt': row['created_at']
        })
    
    return rankings


def get_lineup():
    """获取每个位置评分最高的用户，组成一套阵容"""
    conn = get_db()
    cursor = conn.cursor()
    positions = ['PG', 'SG', 'SF', 'PF', 'C']
    lineup = []

    for pos in positions:
        cursor.execute("""
            SELECT up.id, up.nickname, up.height, up.weight, up.position,
                   r.total_score
            FROM rankings r
            JOIN user_profiles up ON r.user_id = up.id
            WHERE up.position = ?
            ORDER BY r.total_score DESC
            LIMIT 1
        """, (pos,))
        row = cursor.fetchone()
        if not row:
            continue

        # 获取该用户的匹配球星和详细评分
        cursor.execute("""
            SELECT matched_star, matched_star_active, scores, comments
            FROM talent_scores
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT 1
        """, (row['id'],))
        talent = cursor.fetchone()

        entry = {
            'userId': row['id'],
            'nickname': row['nickname'],
            'height': row['height'],
            'weight': row['weight'],
            'position': row['position'],
            'totalScore': round(row['total_score'], 1),
        }
        if talent:
            entry['matchedStar'] = talent['matched_star']
            active = json.loads(talent['matched_star_active']) if talent['matched_star_active'] else {}
            entry['matchedStarName'] = active.get('name', talent['matched_star'])
        lineup.append(entry)

    conn.close()
    return lineup


def get_user_detail(user_id):
    """获取用户完整详情（用于排行榜点击）"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT id, nickname, height, weight, arm_span, vertical_jump, 
               running_jump, position, play_style, created_at
        FROM user_profiles
        WHERE id = ?
    """, (user_id,))
    
    user_row = cursor.fetchone()
    if not user_row:
        conn.close()
        return None
    
    cursor.execute("""
        SELECT matched_star, matched_star_active, matched_star_fun, 
               scores, comments, created_at
        FROM talent_scores
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 1
    """, (user_id,))
    
    score_row = cursor.fetchone()
    conn.close()
    
    result = {
        'user': {
            'id': user_row['id'],
            'nickname': user_row['nickname'],
            'height': user_row['height'],
            'weight': user_row['weight'],
            'armSpan': user_row['arm_span'],
            'verticalJump': user_row['vertical_jump'],
            'runningJump': user_row['running_jump'],
            'position': user_row['position'],
            'playStyle': json.loads(user_row['play_style']) if user_row['play_style'] else [],
            'createdAt': user_row['created_at']
        },
        'talent': None
    }
    
    if score_row:
        result['talent'] = {
            'matchedStar': score_row['matched_star'],
            'matchedStarActive': json.loads(score_row['matched_star_active']) if score_row['matched_star_active'] else {},
            'matchedStarFun': json.loads(score_row['matched_star_fun']) if score_row['matched_star_fun'] else {},
            'scores': json.loads(score_row['scores']) if score_row['scores'] else {},
            'comments': json.loads(score_row['comments']) if score_row['comments'] else {},
            'createdAt': score_row['created_at']
        }
    
    return result

def get_user_history(user_id, limit=5):
    """获取用户历史记录"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT id, matched_star, scores, created_at
        FROM talent_scores
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ?
    """, (user_id, limit))
    
    rows = cursor.fetchall()
    conn.close()
    
    history = []
    for row in rows:
        history.append({
            'id': row['id'],
            'matchedStar': row['matched_star'],
            'scores': json.loads(row['scores']) if row['scores'] else {},
            'createdAt': row['created_at']
        })
    
    return history

def get_all_users():
    """获取所有用户（用于双人对比）"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT id, nickname, height, weight, position
        FROM user_profiles
        ORDER BY created_at DESC
    """)
    
    rows = cursor.fetchall()
    conn.close()
    
    users = []
    for row in rows:
        users.append({
            'id': row['id'],
            'nickname': row['nickname'],
            'height': row['height'],
            'weight': row['weight'],
            'position': row['position']
        })
    
    return users

# ── 图片上传 ──────────────────────────────────────────

def save_image_upload(player_name, player_id, image_type, file_path, original_name, uploaded_by):
    """保存图片上传记录"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO image_uploads (player_name, player_id, image_type, file_path, original_name, uploaded_by)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (player_name, player_id, image_type, file_path, original_name, uploaded_by))
    upload_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return upload_id

def get_player_images(player_name):
    """查询某个球员的所有上传图片"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, player_name, image_type, file_path, original_name, created_at
        FROM image_uploads
        WHERE player_name = ?
        ORDER BY created_at DESC
    """, (player_name,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_all_uploads():
    """管理员获取所有上传记录"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT iu.id, iu.player_name, iu.player_id, iu.image_type,
               iu.file_path, iu.original_name, iu.created_at,
               u.username as uploaded_by_name
        FROM image_uploads iu
        LEFT JOIN users u ON iu.uploaded_by = u.id
        ORDER BY iu.created_at DESC
        LIMIT 100
    """)
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]


def delete_upload_by_id(upload_id):
    """删除上传记录，返回被删除的文件路径"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT file_path FROM image_uploads WHERE id = ?", (upload_id,))
    row = cursor.fetchone()
    file_path = row['file_path'] if row else None
    cursor.execute("DELETE FROM image_uploads WHERE id = ?", (upload_id,))
    conn.commit()
    conn.close()
    return file_path

# ── 球员提交审核 ──────────────────────────────────────

def save_player_submission(data, user_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO player_submissions (name, name_cn, nickname, team, team_abbr, position,
            height, weight, honors, action_description, submitted_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        data.get('name'), data.get('nameCn'), data.get('nickname'),
        data.get('team'), data.get('teamAbbr'), data.get('position'),
        data.get('height'), data.get('weight'), data.get('honors'),
        data.get('actionDescription'), user_id
    ))
    sub_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return sub_id

def get_all_submissions():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT ps.*, u.username as submitted_by_name
        FROM player_submissions ps
        LEFT JOIN users u ON ps.submitted_by = u.id
        ORDER BY ps.created_at DESC
    """)
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def approve_player_submission(sub_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE player_submissions SET status = 'approved' WHERE id = ?", (sub_id,))
    conn.commit()
    cursor.execute("SELECT * FROM player_submissions WHERE id = ?", (sub_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def reject_player_submission(sub_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE player_submissions SET status = 'rejected' WHERE id = ?", (sub_id,))
    conn.commit()
    conn.close()

def delete_player_submission(sub_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM player_submissions WHERE id = ?", (sub_id,))
    conn.commit()
    conn.close()
