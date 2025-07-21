import requests
from setup import Config

def complete_article_category_and_tags(title, summary, content):
    """
    调用 OpenAI API，根据文章内容自动补全分类和标签。
    返回 {'category': ..., 'tags': ...}
    """
    prompt = f"""
请根据以下文章内容，智能补全一个最合适的分类（如前端、后端、AI、生活等）和3-5个标签（用英文逗号分隔）：
标题：{title}
摘要：{summary}
正文：{content[:500]}
输出格式：
分类：xxx
标签：xxx,xxx,xxx
"""
    headers = {
        'Authorization': f'Bearer {Config.OPENAI_API_KEY}',
        'Content-Type': 'application/json'
    }
    data = {
        'model': Config.OPENAI_MODEL,
        'messages': [
            {"role": "system", "content": "你是一个智能内容分类助手。"},
            {"role": "user", "content": prompt}
        ]
    }
    try:
        resp = requests.post('https://api.openai.com/v1/chat/completions', headers=headers, json=data, timeout=20)
        resp.raise_for_status()
        text = resp.json()['choices'][0]['message']['content']
        # 简单解析
        lines = text.strip().split('\n')
        category = ''
        tags = ''
        for line in lines:
            if line.startswith('分类：'):
                category = line.replace('分类：', '').strip()
            if line.startswith('标签：'):
                tags = line.replace('标签：', '').strip()
        return {'category': category, 'tags': tags}
    except Exception as e:
        return {'category': '', 'tags': ''} 