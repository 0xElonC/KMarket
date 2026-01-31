#!/usr/bin/env python3
"""
测试 GET /market/grid 接口
"""

import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:3000/api"

def test_grid():
    """测试获取网格接口"""
    print("=" * 60)
    print("测试 GET /market/grid")
    print("=" * 60)
    
    try:
        resp = requests.get(f"{BASE_URL}/market/grid")
        data = resp.json()
        
        print(f"\n状态码: {resp.status_code}")
        print(f"成功: {data.get('success')}")
        
        if data.get('success'):
            grid = data['data']
            
            print(f"\n📊 基本信息:")
            print(f"  - Symbol: {grid.get('symbol')}")
            print(f"  - 当前价格: {grid.get('currentPrice')}")
            print(f"  - 当前时间: {datetime.fromtimestamp(grid.get('currentTime', 0) / 1000)}")
            print(f"  - 列间隔: {grid.get('intervalSec')}s")
            print(f"  - 是否更新: {grid.get('update')}")
            
            # 显示每列数据
            for col_name in ['col1', 'col2', 'col3', 'col4', 'col5', 'col6']:
                col_data = grid.get(col_name, [])
                if col_data:
                    first_cell = col_data[0]
                    expiry = datetime.fromtimestamp(first_cell.get('expiryTime', 0) / 1000)
                    status = first_cell.get('status', 'unknown')
                    
                    print(f"\n📦 {col_name.upper()} (到期: {expiry.strftime('%H:%M:%S')}, 状态: {status}):")
                    
                    for i, cell in enumerate(col_data, 1):
                        price_range = cell.get('priceRange', {})
                        label = price_range.get('label', 'N/A')
                        odds = cell.get('odds', 'N/A')
                        is_winning = cell.get('isWinning', None)
                        winning_mark = " 🏆" if is_winning else ""
                        
                        print(f"    Row {i}: {label:12} | 赔率: {odds:5}{winning_mark}")
            
            # 打印完整 JSON (缩进格式)
            print("\n" + "=" * 60)
            print("完整响应 JSON:")
            print("=" * 60)
            print(json.dumps(data, indent=2, ensure_ascii=False))
        else:
            print(f"错误: {data.get('message')}")
            
    except requests.exceptions.ConnectionError:
        print("❌ 连接失败，请确保服务器已启动 (npm run start)")
    except Exception as e:
        print(f"❌ 错误: {e}")

if __name__ == "__main__":
    test_grid()
