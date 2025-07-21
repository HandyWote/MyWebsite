from flask import Blueprint, request, jsonify
from extensions import db
from models.article import Article
from datetime import datetime

public_bp = Blueprint('public', __name__)

@public_bp.route('/articles', methods=['GET'])
def get_articles():
    """获取文章列表 - 公开接口"""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    search = request.args.get('search', '')
    category = request.args.get('category', '')
    tag = request.args.get('tag', '')
    
    query = Article.query.filter_by(deleted_at=None)
    
    if search:
        query = query.filter(Article.title.ilike(f'%{search}%'))
    if category:
        query = query.filter(Article.category == category)
    if tag:
        query = query.filter(Article.tags.ilike(f'%{tag}%'))
    
    pagination = query.order_by(Article.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
    
    articles = []
    for article in pagination.items:
        # 处理标签字符串为数组
        tags = []
        if article.tags:
            tags = [tag.strip() for tag in article.tags.split(',') if tag.strip()]
        
        articles.append({
            'id': article.id,
            'title': article.title,
            'category': article.category,
            'tags': tags,
            'cover_image': article.cover,
            'summary': article.summary,
            'views': 0,  # 暂时设为0，后续可以添加浏览量字段
            'comment_count': 0,  # 暂时设为0，后续可以添加评论功能
            'created_at': article.created_at.isoformat() if article.created_at else None
        })
    
    return jsonify({
        'code': 0, 
        'msg': 'success', 
        'articles': articles,
        'total': pagination.total, 
        'pages': pagination.pages, 
        'current_page': page
    })

@public_bp.route('/articles/<int:article_id>', methods=['GET'])
def get_article_detail(article_id):
    """获取文章详情 - 公开接口"""
    article = Article.query.filter_by(id=article_id, deleted_at=None).first()
    
    if not article:
        return jsonify({'code': 1, 'msg': '文章不存在'}), 404
    
    # 处理标签字符串为数组
    tags = []
    if article.tags:
        tags = [tag.strip() for tag in article.tags.split(',') if tag.strip()]
    
    # 处理评论（暂时返回空数组）
    comments = []
    
    return jsonify({
        'code': 0,
        'msg': 'success',
        'id': article.id,
        'title': article.title,
        'category': article.category,
        'tags': tags,
        'cover_image': article.cover,
        'summary': article.summary,
        'content': article.content,
        'views': 0,  # 暂时设为0
        'comment_count': 0,  # 暂时设为0
        'comments': comments,
        'created_at': article.created_at.isoformat() if article.created_at else None
    })

@public_bp.route('/categories', methods=['GET'])
def get_categories():
    """获取所有分类 - 公开接口"""
    categories = db.session.query(Article.category).filter(
        Article.category.isnot(None),
        Article.category != '',
        Article.deleted_at.is_(None)
    ).distinct().all()
    
    category_list = [cat[0] for cat in categories if cat[0]]
    
    return jsonify({
        'code': 0,
        'msg': 'success',
        'categories': category_list
    })

@public_bp.route('/tags', methods=['GET'])
def get_tags():
    """获取所有标签 - 公开接口"""
    # 获取所有文章的标签
    articles = Article.query.filter_by(deleted_at=None).all()
    
    tag_count = {}
    for article in articles:
        if article.tags:
            tags = [tag.strip() for tag in article.tags.split(',') if tag.strip()]
            for tag in tags:
                tag_count[tag] = tag_count.get(tag, 0) + 1
    
    return jsonify({
        'code': 0,
        'msg': 'success',
        'tags': tag_count
    }) 