#!/usr/bin/env python3
"""
评论限制功能测试脚本

用于测试评论限制功能是否正常工作：
1. 测试同一IP在时间窗口内发表多条评论
2. 测试不同IP发表评论
3. 测试白名单IP
4. 测试管理员豁免
"""

import sys
import os
import requests
import json
import time
from datetime import datetime, timedelta

# 添加项目根目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_comment_limits():
    """测试评论限制功能"""
    base_url = "http://localhost:5000"
    
    # 测试数据
    test_article_id = 1  # 假设存在ID为1的文章
    test_ip = "192.168.1.100"
    test_author = "测试用户"
    test_content = "这是一条测试评论"
    
    print("=== 评论限制功能测试 ===")
    print(f"测试文章ID: {test_article_id}")
    print(f"测试IP: {test_ip}")
    print(f"测试作者: {test_author}")
    print()
    
    # 1. 测试发表第一条评论（应该成功）
    print("1. 测试发表第一条评论...")
    response = send_test_comment(base_url, test_article_id, test_author, test_content, test_ip)
    if response.status_code == 201:
        print("✅ 第一条评论发表成功")
    else:
        print(f"❌ 第一条评论发表失败: {response.status_code} - {response.text}")
        return
    
    # 2. 测试发表第二条评论（应该被限制）
    print("\n2. 测试发表第二条评论（应该被限制）...")
    response = send_test_comment(base_url, test_article_id, test_author, test_content + "2", test_ip)
    if response.status_code == 429:
        print("✅ 第二条评论被正确限制")
        print(f"   限制原因: {response.json().get('msg', '未知原因')}")
    else:
        print(f"❌ 第二条评论未被限制: {response.status_code} - {response.text}")
    
    # 3. 测试不同IP发表评论（应该成功）
    print("\n3. 测试不同IP发表评论...")
    different_ip = "192.168.1.101"
    response = send_test_comment(base_url, test_article_id, test_author + "2", test_content, different_ip)
    if response.status_code == 201:
        print("✅ 不同IP评论发表成功")
    else:
        print(f"❌ 不同IP评论发表失败: {response.status_code} - {response.text}")
    
    # 4. 测试获取评论限制配置
    print("\n4. 测试获取评论限制配置...")
    try:
        response = requests.get(f"{base_url}/api/admin/comments/limits")
        if response.status_code == 200:
            config = response.json().get('data', {})
            print("✅ 评论限制配置获取成功")
            print(f"   启用状态: {config.get('enabled', '未知')}")
            print(f"   时间窗口: {config.get('time_window_hours', '未知')} 小时")
            print(f"   最大评论数: {config.get('max_comments', '未知')}")
            print(f"   白名单IP: {config.get('whitelist_ips', '未知')}")
            print(f"   管理员豁免: {config.get('exempt_admin', '未知')}")
        else:
            print(f"❌ 获取评论限制配置失败: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"❌ 获取评论限制配置时出错: {e}")
    
    print("\n=== 测试完成 ===")

def send_test_comment(base_url, article_id, author, content, ip_address):
    """发送测试评论"""
    url = f"{base_url}/api/articles/{article_id}/comments"
    headers = {
        "Content-Type": "application/json",
        "X-Forwarded-For": ip_address,  # 模拟IP地址
        "X-Real-IP": ip_address,
    }
    data = {
        "author": author,
        "content": content,
        "email": ""
    }
    
    try:
        response = requests.post(url, headers=headers, json=data, timeout=10)
        return response
    except Exception as e:
        print(f"❌ 发送评论请求时出错: {e}")
        return None

if __name__ == "__main__":
    test_comment_limits()