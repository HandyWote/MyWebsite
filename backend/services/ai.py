import requests
import json
import re
from setup import Config

def analyze_article_content(title, content, summary=""):
    """
    使用AI分析文章内容，自动识别分类和标签

    Args:
        title (str): 文章标题
        content (str): 文章正文内容
        summary (str): 文章摘要（可选）

    Returns:
        dict: {
            'success': bool,
            'category': str,
            'tags': list,
            'suggested_summary': str,  # 如果没有摘要，AI会生成建议摘要
            'error': str  # 错误信息（如果有）
        }
    """
    config = Config()

    # 检查API密钥配置
    if not config.OPENAI_API_KEY or config.OPENAI_API_KEY == 'sk-xxxx':
        return {
            'success': False,
            'category': '',
            'tags': [],
            'suggested_summary': '',
            'error': 'OpenAI API密钥未配置或无效'
        }

    # 构建更详细的prompt
    prompt = f"""
请分析以下文章内容，并提供智能分类和标签建议：

标题：{title}
{f"摘要：{summary}" if summary else ""}
正文内容：{content[:1000]}...

请根据文章内容分析并返回以下信息：
1. 最合适的分类（从以下选项中选择或提出新的分类）：
   - 技术开发（前端、后端、移动开发、DevOps等）
   - 人工智能（机器学习、深度学习、AI应用等）
   - 产品设计（UI/UX、产品思维、设计理念等）
   - 生活随笔（日常感悟、旅行、读书等）
   - 学习笔记（技术学习、课程总结等）
   - 项目经验（项目总结、技术选型等）
   - 行业观察（技术趋势、行业分析等）

2. 3-5个相关标签（具体的技术栈、工具、概念等）

3. 如果没有摘要，请生成一个50-100字的文章摘要

请严格按照以下JSON格式返回：
{{
    "category": "分类名称",
    "tags": ["标签1", "标签2", "标签3"],
    "summary": "文章摘要（如果原本没有摘要的话）"
}}
"""

    headers = {
        'Authorization': f'Bearer {config.OPENAI_API_KEY}',
        'Content-Type': 'application/json'
    }

    data = {
        'model': config.OPENAI_MODEL,
        'messages': [
            {
                "role": "system",
                "content": "你是一个专业的内容分析助手，擅长分析技术文章和博客内容，能够准确识别文章的主题分类和相关标签。请始终返回有效的JSON格式。"
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        'temperature': 0.3,  # 降低随机性，提高一致性
        'max_tokens': 50000
    }

    try:
        # 构建API URL，确保正确处理末尾斜杠
        api_base_url = config.OPENAI_API_URL.rstrip('/')
        api_url = f"{api_base_url}"

        response = requests.post(
            api_url,
            headers=headers,
            json=data,
            timeout=30
        )
        response.raise_for_status()

        result = response.json()
        ai_response = result['choices'][0]['message']['content'].strip()

        # 尝试解析JSON响应
        try:
            # 提取JSON部分（有时AI会在JSON前后添加说明文字）
            json_match = re.search(r'\{.*\}', ai_response, re.DOTALL)
            if json_match:
                ai_data = json.loads(json_match.group())
            else:
                ai_data = json.loads(ai_response)

            return {
                'success': True,
                'category': ai_data.get('category', ''),
                'tags': ai_data.get('tags', []),
                'suggested_summary': ai_data.get('summary', '') if not summary else '',
                'error': ''
            }

        except json.JSONDecodeError:
            # 如果JSON解析失败，尝试文本解析
            return _parse_text_response(ai_response)

    except requests.exceptions.Timeout:
        return {
            'success': False,
            'category': '',
            'tags': [],
            'suggested_summary': '',
            'error': 'AI服务请求超时，请稍后重试'
        }
    except requests.exceptions.RequestException as e:
        return {
            'success': False,
            'category': '',
            'tags': [],
            'suggested_summary': '',
            'error': f'AI服务请求失败：{str(e)}'
        }
    except Exception as e:
        return {
            'success': False,
            'category': '',
            'tags': [],
            'suggested_summary': '',
            'error': f'AI分析过程中发生错误：{str(e)}'
        }

def _parse_text_response(text):
    """
    当JSON解析失败时，尝试从文本中提取信息
    """
    category = ''
    tags = []
    summary = ''

    lines = text.strip().split('\n')
    for line in lines:
        line = line.strip()
        if '分类' in line or 'category' in line.lower():
            # 提取分类
            category = re.sub(r'.*[:：]\s*', '', line).strip()
        elif '标签' in line or 'tags' in line.lower():
            # 提取标签
            tags_text = re.sub(r'.*[:：]\s*', '', line).strip()
            tags = [tag.strip() for tag in re.split(r'[,，、]', tags_text) if tag.strip()]
        elif '摘要' in line or 'summary' in line.lower():
            # 提取摘要
            summary = re.sub(r'.*[:：]\s*', '', line).strip()

    return {
        'success': True,
        'category': category,
        'tags': tags,
        'suggested_summary': summary,
        'error': ''
    }

# 保持向后兼容的旧函数
def complete_article_category_and_tags(title, summary, content):
    """
    旧版本的函数，保持向后兼容
    """
    result = analyze_article_content(title, content, summary)
    return {
        'category': result['category'],
        'tags': ','.join(result['tags']) if result['tags'] else ''
    }