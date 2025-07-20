from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from extensions import db
from models.article import Article
from datetime import datetime

article_bp = Blueprint('article', __name__)

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