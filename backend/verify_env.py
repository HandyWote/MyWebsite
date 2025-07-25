#!/usr/bin/env python3
"""
环境变量验证脚本
用于验证环境变量是否从正确位置加载
"""

import sys
import os

# 添加当前目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def verify_env_loading():
    """验证环境变量加载"""
    print("=== 环境变量加载验证 ===")
    
    # 显示当前工作目录
    print(f"当前工作目录: {os.getcwd()}")
    print(f"脚本所在目录: {os.path.dirname(os.path.abspath(__file__))}")
    
    # 计算根目录路径
    script_dir = os.path.dirname(os.path.abspath(__file__))
    root_dir = os.path.abspath(os.path.join(script_dir, '..'))
    env_file_path = os.path.join(root_dir, '.env')
    
    print(f"根目录路径: {root_dir}")
    print(f".env 文件路径: {env_file_path}")
    print(f".env 文件是否存在: {os.path.exists(env_file_path)}")
    
    if os.path.exists(env_file_path):
        print(f".env 文件大小: {os.path.getsize(env_file_path)} 字节")
        
        # 读取并显示.env文件内容（隐藏敏感信息）
        print("\n=== .env 文件内容预览 ===")
        try:
            with open(env_file_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
                for i, line in enumerate(lines[:20], 1):  # 只显示前20行
                    line = line.strip()
                    if line and not line.startswith('#'):
                        if 'API_KEY' in line or 'PASSWORD' in line or 'SECRET' in line:
                            # 隐藏敏感信息
                            key = line.split('=')[0]
                            print(f"{i:2d}: {key}=***")
                        else:
                            print(f"{i:2d}: {line}")
                    elif line:
                        print(f"{i:2d}: {line}")
        except Exception as e:
            print(f"读取.env文件时出错: {e}")
    
    # 测试通过setup.py加载配置
    print("\n=== 通过 setup.py 加载配置 ===")
    try:
        from setup import Config
        config = Config()
        
        print("✅ Config类导入成功")
        print(f"SECRET_KEY: {'已设置' if config.SECRET_KEY else '未设置'}")
        print(f"SQLALCHEMY_DATABASE_URI: {'已设置' if hasattr(config, 'SQLALCHEMY_DATABASE_URI') and config.SQLALCHEMY_DATABASE_URI else '未设置'}")
        print(f"ADMIN_USERNAME: {config.ADMIN_USERNAME}")
        
        # AI相关配置
        print(f"OPENAI_API_KEY: {'已设置' if config.OPENAI_API_KEY and config.OPENAI_API_KEY != 'sk-xxxx' else '未设置或使用默认值'}")
        print(f"OPENAI_MODEL: {config.OPENAI_MODEL}")
        print(f"OPENAI_API_URL: {config.OPENAI_API_URL}")
        
    except Exception as e:
        print(f"❌ 加载Config类时出错: {e}")
        import traceback
        traceback.print_exc()
    
    # 直接测试环境变量
    print("\n=== 直接读取环境变量 ===")
    
    # 手动加载.env文件
    try:
        from dotenv import load_dotenv
        load_result = load_dotenv(env_file_path)
        print(f"load_dotenv 返回值: {load_result}")
        
        # 测试几个关键环境变量
        test_vars = [
            'SECRET_KEY',
            'DATABASE_URL', 
            'OPENAI_API_KEY',
            'OPENAI_MODEL',
            'OPENAI_API_URL'
        ]
        
        for var in test_vars:
            value = os.environ.get(var)
            if value:
                if 'KEY' in var or 'PASSWORD' in var or 'SECRET' in var:
                    print(f"{var}: ***")
                else:
                    print(f"{var}: {value}")
            else:
                print(f"{var}: 未设置")
                
    except Exception as e:
        print(f"❌ 直接加载环境变量时出错: {e}")

if __name__ == "__main__":
    verify_env_loading()
