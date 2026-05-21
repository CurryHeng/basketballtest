#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
NBA 球星动作图下载器
从 Wikipedia 获取球员赛场动作照片（扣篮、投篮等）。
用法: python download_actions.py
"""

import json
import os
import time
import requests
from pathlib import Path

HEADERS = {'User-Agent': 'BasketballApp/1.0 (curryheng)'}

# Wikipedia 页面标题（用于获取更多图片）
WIKI_PAGES = {
    "Stephen Curry": "Stephen_Curry",
    "LeBron James": "LeBron_James",
    "Kevin Durant": "Kevin_Durant",
    "Giannis Antetokounmpo": "Giannis_Antetokounmpo",
    "Luka Doncic": "Luka_Dončić",
    "Joel Embiid": "Joel_Embiid",
    "Nikola Jokic": "Nikola_Jokić",
    "Jayson Tatum": "Jayson_Tatum",
    "Anthony Davis": "Anthony_Davis_(basketball)",
    "Kawhi Leonard": "Kawhi_Leonard",
    "Damian Lillard": "Damian_Lillard",
    "Shai Gilgeous-Alexander": "Shai_Gilgeous-Alexander",
    "Anthony Edwards": "Anthony_Edwards_(basketball)",
    "Jalen Brunson": "Jalen_Brunson",
    "Devin Booker": "Devin_Booker",
    "Jimmy Butler": "Jimmy_Butler",
    "Trae Young": "Trae_Young",
    "Kyrie Irving": "Kyrie_Irving",
    "Bam Adebayo": "Bam_Adebayo",
    "Klay Thompson": "Klay_Thompson",
    "Victor Wembanyama": "Victor_Wembanyama",
    "De'Aaron Fox": "De'Aaron_Fox",
    "Pascal Siakam": "Pascal_Siakam",
    "Zion Williamson": "Zion_Williamson",
    "Ja Morant": "Ja_Morant",
    "James Harden": "James_Harden",
    "Chris Paul": "Chris_Paul",
    "Bradley Beal": "Bradley_Beal",
    "Jaylen Brown": "Jaylen_Brown_(basketball)",
    "Jaren Jackson Jr.": "Jaren_Jackson_Jr.",
}

# NBA CDN 球员 ID（已确认可用的）
NBA_IDS = {
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


def get_wiki_action_image(wiki_title):
    """从 Wikipedia 页面获取非头像的篮球动作图片"""
    try:
        # 获取页面上的所有图片
        url = f"https://en.wikipedia.org/w/api.php?action=query&titles={wiki_title}&prop=images&format=json&imlimit=50"
        r = requests.get(url, headers=HEADERS, timeout=15)
        data = r.json()
        pages = data.get('query', {}).get('pages', {})
        images = []
        for pid, info in pages.items():
            for img in info.get('images', []):
                title = img.get('title', '')
                # 过滤：排除 SVG、图标、logo，找含球员名或 action 关键词的 JPG
                if title.endswith('.jpg') and not any(k in title.lower() for k in ['logo', 'icon', 'svg', 'map', 'flag']):
                    images.append(title)

        # 去掉第一个（通常是头像），取后面的作为动作图
        candidates = images[1:6] if len(images) > 1 else images[:3]

        for img_title in candidates:
            # 获取图片 URL
            img_url = f"https://en.wikipedia.org/w/api.php?action=query&titles={img_title}&prop=imageinfo&iiprop=url&format=json"
            r2 = requests.get(img_url, headers=HEADERS, timeout=15)
            data2 = r2.json()
            for pid2, info2 in data2.get('query', {}).get('pages', {}).items():
                if 'imageinfo' in info2:
                    return info2['imageinfo'][0]['url']

        return None
    except Exception as e:
        print(f"    Wikipedia 请求失败: {e}")
        return None


def get_nba_action_url(player_id):
    return f"https://cdn.nba.com/headshots/nba/latest/1040x760/{player_id}.png"


def download_image(url, filepath):
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    try:
        r = requests.get(url, headers=HEADERS, timeout=15, stream=True)
        if r.status_code == 200:
            with open(filepath, 'wb') as f:
                for chunk in r.iter_content(chunk_size=8192):
                    f.write(chunk)
            return os.path.getsize(filepath) > 5000
    except Exception as e:
        print(f"    下载失败: {e}")
    return False


def main():
    print("=" * 60)
    print("NBA 球星动作图下载器")
    print("=" * 60)

    with open('data/players.json', 'r', encoding='utf-8') as f:
        players = json.load(f)

    stats = {"new": 0, "skip": 0, "fail": []}

    for player in players:
        name = player['name']
        current_gif = player.get('actionGif', '')
        # 图片名：用球员名生成
        name_slug = name.lower().replace(' ', '_').replace("'", '').replace('.', '').replace('-', '_')
        new_path = f"images/{name_slug}_action.jpg"

        print(f"\n[{player['id']:2d}/{len(players)}] {name}")

        # 检查是否已有动作图（非头像）
        if current_gif and current_gif.startswith('images/'):
            old_file = current_gif
            # 如果现在的动作图和头像一样，需要替换
            if old_file == player['profileImage']:
                print(f"  当前动图=头像，需要替换")
            else:
                print(f"  已有动作图，跳过")
                stats["skip"] += 1
                continue

        # 方案1：从 Wikipedia 获取动作图片
        wiki_title = WIKI_PAGES.get(name)
        wiki_url = None
        if wiki_title:
            print(f"  搜索 Wikipedia 动作图...")
            wiki_url = get_wiki_action_image(wiki_title)
            if wiki_url:
                print(f"  找到 Wikipedia 图片")
                if download_image(wiki_url, new_path):
                    size = os.path.getsize(new_path)
                    print(f"  ✓ {size//1024}KB")
                    player['actionGif'] = new_path
                    stats["new"] += 1
                    time.sleep(0.5)
                    continue

        # 方案2：使用 NBA 头像作为动作图（但用更大的尺寸或不同角度）
        nba_id = NBA_IDS.get(name)
        if nba_id:
            print(f"  使用 NBA 头像作为动作图...")
            url = get_nba_action_url(nba_id)
            if download_image(url, new_path):
                size = os.path.getsize(new_path)
                print(f"  ✓ {size//1024}KB (NBA 头像)")
                player['actionGif'] = new_path
                stats["new"] += 1
                time.sleep(0.3)
                continue

        print(f"  ✗ 未找到动作图")
        stats["fail"].append(name)

    # 保存更新
    with open('data/players.json', 'w', encoding='utf-8') as f:
        json.dump(players, f, ensure_ascii=False, indent=2)

    print(f"\n{'='*60}")
    print(f"完成: {stats['new']} 张新下载, {stats['skip']} 张跳过")
    if stats['fail']:
        print(f"失败: {', '.join(stats['fail'])}")
    print("运行 git status 查看更改")


if __name__ == '__main__':
    main()
