#!/usr/bin/env python3
"""
AI服务测试脚本
"""

import sys
import os

# 添加当前目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_ai_service():
    """测试AI服务配置和功能"""
    print("=== AI服务测试 ===")
    
    try:
        # 导入配置
        from config import Config
        config = Config()
        
        print(f"AI配置检查:")
        print(f"  OPENAI_API_KEY: {'已配置' if config.OPENAI_API_KEY and config.OPENAI_API_KEY != 'sk-xxxx' else '未配置'}")
        print(f"  OPENAI_MODEL: {config.OPENAI_MODEL}")
        print(f"  OPENAI_API_URL: {config.OPENAI_API_URL}")
        
        if not config.OPENAI_API_KEY or config.OPENAI_API_KEY == 'sk-xxxx':
            print("❌ AI API密钥未正确配置")
            return False
        
        # 测试AI服务导入
        try:
            from services.ai import analyze_article_content
            print("✅ AI服务模块导入成功")
        except Exception as e:
            print(f"❌ AI服务模块导入失败: {e}")
            return False
        
        # 测试AI分析功能
        print("\n=== 测试AI分析功能 ===")
        test_title = "Python Web开发入门"
        test_content = """
        Python是一种高级编程语言，广泛用于Web开发。
        Flask是一个轻量级的Web框架，适合快速开发Web应用。
        本文将介绍如何使用Flask创建一个简单的Web应用。
        """
        
        print(f"测试标题: {test_title}")
        print(f"测试内容: {test_content[:50]}...")
        
        try:
            result = analyze_article_content(test_title, test_content)
            
            if result['success']:
                print("✅ AI分析成功!")
                print(f"  建议分类: {result['category']}")
                print(f"  建议标签: {result['tags']}")
                if result['suggested_summary']:
                    print(f"  建议摘要: {result['suggested_summary'][:100]}...")
                return True
            else:
                print(f"❌ AI分析失败: {result['error']}")
                return False
                
        except Exception as e:
            print(f"❌ AI分析过程中出错: {e}")
            import traceback
            traceback.print_exc()
            return False
            
    except Exception as e:
        print(f"❌ 测试过程中出错: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_ai_service()
    if success:
        print("\n🎉 AI服务测试通过!")
    else:
        print("\n💥 AI服务测试失败!")
        sys.exit(1)
