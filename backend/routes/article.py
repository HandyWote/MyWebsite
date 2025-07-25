from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required
from extensions import db
from models.article import Article
from services.ai import analyze_article_content
from datetime import datetime
import os
from flask import send_from_directory
from werkzeug.utils import secure_filename
import uuid

article_bp = Blueprint('article', __name__)

# 移除硬编码的UPLOAD_FOLDER，使用current_app.config['UPLOAD_FOLDER']替代
ALLOWED_IMAGE_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'}

@article_bp.route('/articles', methods=['GET'])
@jwt_required()
def get_articles():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    search = request.args.get('search', '')
    query = Article.query.filter_by(deleted_at=None)
    if search:
        query = query.filter(Article.title.ilike(f'%{search}%'))
    pagination = query.order_by(Article.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
    return jsonify({'code': 0, 'msg': 'success', 'data': [
        {'id': a.id, 'title': a.title, 'category': a.category, 'tags': a.tags, 'cover': a.cover, 'summary': a.summary, 'created_at': a.created_at, 'updated_at': a.updated_at} for a in pagination.items
    ], 'total': pagination.total, 'pages': pagination.pages, 'current_page': page})

@article_bp.route('/articles', methods=['POST'])
@jwt_required()
def add_article():
    data = request.json
    # TODO: AI补全分类/标签
    article = Article(
        title=data['title'],
        category=data.get('category', ''),
        tags=data.get('tags', ''),
        cover=data.get('cover', ''),
        summary=data.get('summary', ''),
        content=data.get('content', '')
    )
    db.session.add(article)
    db.session.commit()
    return jsonify({'code': 0, 'msg': '新增成功', 'id': article.id})

@article_bp.route('/articles/<int:article_id>', methods=['PUT'])
@jwt_required()
def update_article(article_id):
    data = request.json
    article = Article.query.get_or_404(article_id)
    article.title = data.get('title', article.title)
    article.category = data.get('category', article.category)
    article.tags = data.get('tags', article.tags)
    article.cover = data.get('cover', article.cover)
    article.summary = data.get('summary', article.summary)
    article.content = data.get('content', article.content)
    article.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify({'code': 0, 'msg': '更新成功'})

@article_bp.route('/articles/<int:article_id>', methods=['DELETE'])
@jwt_required()
def delete_article(article_id):
    article = Article.query.get_or_404(article_id)
    article.deleted_at = datetime.utcnow()
    db.session.commit()
    return jsonify({'code': 0, 'msg': '删除成功'})

@article_bp.route('/articles/<int:article_id>', methods=['GET'])
@jwt_required()
def get_article_detail(article_id):
    article = Article.query.get_or_404(article_id)
    return jsonify({
        'id': article.id,
        'title': article.title,
        'category': article.category,
        'tags': article.tags,
        'cover': article.cover,
        'summary': article.summary,
        'content': article.content,
        'created_at': article.created_at,
        'updated_at': article.updated_at
    })

@article_bp.route('/articles/ai-analyze', methods=['POST'])
@jwt_required()
def ai_analyze_article():
    """
    AI智能分析文章内容，提供分类和标签建议
    """
    data = request.json
    
    # 检查请求数据是否存在
    if data is None:
        return jsonify({
            'code': 1,
            'msg': '请求数据格式错误，请确保发送的是有效的JSON数据',
            'data': None
        }), 400

    # 验证必需参数
    if not data.get('title') or not data.get('content'):
        return jsonify({
            'code': 1,
            'msg': '标题和内容不能为空',
            'data': None
        }), 400

    # 安全地获取和处理数据，确保不会有None值
    title = data.get('title', '') or ''
    content = data.get('content', '') or ''
    summary = data.get('summary', '') or ''
    
    # 确保字符串方法可以安全调用
    title = title.strip() if title else ''
    content = content.strip() if content else ''
    summary = summary.strip() if summary else ''

    # 调用AI分析服务
    result = analyze_article_content(title, content, summary)
    
    # 记录AI分析结果用于调试
    print(f"AI分析结果: {result}")

    if result['success']:
        return jsonify({
            'code': 0,
            'msg': 'AI分析完成',
            'data': {
                'category': result['category'],
                'tags': result['tags'],
                'suggested_summary': result['suggested_summary']
            }
        })
    else:
        return jsonify({
            'code': 1,
            'msg': result['error'],
            'data': None
        }), 500

# 1. 文章封面图片上传接口
@article_bp.route('/articles/cover', methods=['POST'])
@jwt_required()
def upload_article_cover():
    file = request.files.get('file')
    if not file:
        return jsonify({'code': 1, 'msg': '未上传文件'}), 400
    ext = file.filename.rsplit('.', 1)[-1].lower()
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        return jsonify({'code': 1, 'msg': '不支持的图片格式'}), 400
    filename = f"{uuid.uuid4().hex}.{ext}"
    save_path = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
    os.makedirs(current_app.config['UPLOAD_FOLDER'], exist_ok=True)
    file.save(save_path)
    url = f"/api/admin/articles/cover/{filename}"
    return jsonify({'code': 0, 'msg': '上传成功', 'url': url})

# 2. 文章封面图片静态访问接口
@article_bp.route('/articles/cover/<filename>')
def get_article_cover(filename):
    return send_from_directory(current_app.config['UPLOAD_FOLDER'], filename)

# 3. 批量导入Markdown接口（支持上传多个md文件）
@article_bp.route('/articles/import-md', methods=['POST'])
@jwt_required()
def import_articles_md():
    files = request.files.getlist('files')
    if not files:
        return jsonify({'code': 1, 'msg': '未上传文件'}), 400
    imported = 0
    for file in files:
        text = file.read().decode('utf-8')
        lines = text.split('\n')
        title = ''
        content = text
        for l in lines:
            if l.startswith('# '):
                title = l.replace('# ', '').strip()
                content = '\n'.join(lines[1:]).strip()
                break
        if not title or not content:
            continue
        article = Article(title=title, content=content)
        db.session.add(article)
        imported += 1
    db.session.commit()
    return jsonify({'code': 0, 'msg': f'成功导入{imported}篇文章'})

# 4. 文章批量删除接口
@article_bp.route('/articles/batch-delete', methods=['POST'])
@jwt_required()
def batch_delete_articles():
    ids = request.json.get('ids', [])
    if not ids:
        return jsonify({'code': 1, 'msg': '未提供ids'}), 400
    articles = Article.query.filter(Article.id.in_(ids)).all()
    for article in articles:
        article.deleted_at = datetime.utcnow()
    db.session.commit()
    return jsonify({'code': 0, 'msg': f'已批量删除{len(articles)}篇文章'}) 