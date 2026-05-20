#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
NBA 球星图片下载器
从 NBA 官方 CDN 下载球星高清头像。
用法: python download_images.py
"""

import json
import os
import time
import requests

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Referer': 'https://www.nba.com/',
}

# NBA 官方 CDN 上每位球员的 ID（已验证可用）
PLAYER_IDS = {
    "Stephen Curry": 201939,
    "LeBron James": 2544,
    "Kevin Durant": 201142,
    "Giannis Antetokounmpo": 203507,
    "Luka Doncic": 1629029,
    "Joel Embiid": 203954,
    "Nikola Jokic": 203999,
    "Jayson Tatum": 1628369,
    "Anthony Davis": 203076,
    "Kawhi Leonard": 202695,
    "Damian Lillard": 203081,
    "Shai Gilgeous-Alexander": 1628983,
    "Anthony Edwards": 1630162,
    "Jalen Brunson": 1628973,
    "Devin Booker": 1626164,
    "Jimmy Butler": 202710,
    "Trae Young": 1629027,
    "Kyrie Irving": 202681,
    "Bam Adebayo": 1628389,
    "Klay Thompson": 202691,
    "Victor Wembanyama": 1641705,
    "De'Aaron Fox": 1628368,
    "Pascal Siakam": 1627783,
    "Zion Williamson": 1629627,
    "Ja Morant": 1629630,
    "James Harden": 201935,
    "Chris Paul": 101108,
    "Bradley Beal": 203078,
    "Jaylen Brown": 1627759,
    "Jaren Jackson Jr.": 1628991,
}

NBA_CDN = "https://cdn.nba.com/headshots/nba/latest/1040x760/{}.png"


def download_image(url, filepath):
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    try:
        r = requests.get(url, headers=HEADERS, timeout=15, stream=True)
        if r.status_code == 200:
            with open(filepath, 'wb') as f:
                for chunk in r.iter_content(chunk_size=8192):
                    f.write(chunk)
            size = os.path.getsize(filepath)
            return size > 5000  # 至少 5KB 才算有效图片
    except Exception as e:
        print(f"    请求失败: {e}")
    return False


def needs_update(filepath, min_size=15000):
    if not os.path.exists(filepath):
        return True
    return os.path.getsize(filepath) < min_size


def make_filename(name):
    name = name.lower().replace(" ", "_").replace("'", "").replace(".", "").replace("-", "_")
    return f"images/{name}_profile.jpg"


def main():
    print("=" * 60)
    print("NBA 球星头像下载器 (NBA 官方 CDN)")
    print("=" * 60)

    with open('data/players.json', 'r', encoding='utf-8') as f:
        players = json.load(f)

    changed = False
    stats = {"new": 0, "skip": 0, "fail": []}

    for player in players:
        name = player['name']
        current_path = player['profileImage']

        print(f"\n[{player['id']:2d}/{len(players)}] {name}")

        # 决定下载到哪里
        if current_path.startswith('images/') and not current_path.startswith('https://'):
            local_path = current_path
        else:
            # URL 图片 → 改成本地文件
            local_path = make_filename(name)
            player['profileImage'] = local_path
            changed = True

        if not needs_update(local_path):
            print(f"  ✓ 已有 ({os.path.getsize(local_path)//1024}KB)，跳过")
            stats["skip"] += 1
            continue

        nba_id = PLAYER_IDS.get(name)
        if not nba_id:
            print(f"  ✗ 未知 NBA ID，跳过")
            stats["fail"].append(name)
            continue

        url = NBA_CDN.format(nba_id)
        print(f"  下载中... ({url})")

        if download_image(url, local_path):
            size = os.path.getsize(local_path)
            print(f"  ✓ {size//1024}KB → {local_path}")
            stats["new"] += 1
            changed = True
        else:
            print(f"  ✗ 下载失败，跳过")
            stats["fail"].append(name)

        # 同时也更新 actionGif（如果是占位图或太小）
        gif_path = player.get('actionGif', '')
        if gif_path and not gif_path.startswith('https://'):
            if needs_update(gif_path, 5000):
                gif_local = gif_path.replace('.gif', '.jpg')
                # 用头像图片替代 GIF
                import shutil
                if os.path.exists(local_path):
                    shutil.copy2(local_path, gif_local)
                    player['actionGif'] = gif_local
                    print(f"  → 动作图已同步: {gif_local}")
                    changed = True

        time.sleep(0.3)

    if changed:
        with open('data/players.json', 'w', encoding='utf-8') as f:
            json.dump(players, f, ensure_ascii=False, indent=2)
        print(f"\n✅ players.json 已更新")

    print(f"\n{'='*60}")
    print(f"完成: {stats['new']} 张新下载, {stats['skip']} 张跳过")
    if stats['fail']:
        print(f"失败: {', '.join(stats['fail'])}")
    print(f"\n运行 git status 查看更改，然后 git add/commit/push 到 GitHub")


if __name__ == '__main__':
    main()
