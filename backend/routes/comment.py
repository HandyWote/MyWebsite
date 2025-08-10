from flask import Blueprint, request, jsonify
from extensions import db
from models.comment import Comment
from models.article import Article
from utils.response import success, error
from flask_jwt_extended import jwt_required
from datetime import datetime

comment_bp = Blueprint('comment', __name__)

@comment_bp.route('/articles/<int:article_id>/comments', methods=['GET'])
def get_article_comments(article_id):
    """获取文章评论列表"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        # 验证文章存在
        article = Article.query.filter_by(id=article_id, deleted_at=None).first()
        if not article:
            return error('文章不存在', 404)
        
        # 获取评论分页
        pagination = Comment.query.filter_by(article_id=article_id)\
            .order_by(Comment.created_at.desc())\
            .paginate(page=page, per_page=per_page, error_out=False)
        
        comments = [comment.to_dict() for comment in pagination.items]
        
        return success({
            'comments': comments,
            'total': pagination.total,
            'pages': pagination.pages,
            'current_page': page
        })
    except Exception as e:
        return error(f'获取评论失败: {str(e)}', 500)

@comment_bp.route('/articles/<int:article_id>/comments', methods=['POST'])
def create_comment(article_id):
    """创建新评论"""
    try:
        data = request.get_json()
        
        # 验证必填字段
        if not data.get('author') or not data.get('content'):
            return error('作者和内容不能为空', 400)
        
        # 验证文章存在
        article = Article.query.filter_by(id=article_id, deleted_at=None).first()
        if not article:
            return error('文章不存在', 404)
        
        # 创建评论
        comment = Comment(
            article_id=article_id,
            author=data['author'].strip(),
            email=data.get('email', '').strip() or None,
            content=data['content'].strip(),
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent', '')
        )
        
        db.session.add(comment)
        db.session.commit()
        
        return success({
            'comment': comment.to_dict(),
            'message': '评论发布成功'
        }, 201)
    except Exception as e:
        db.session.rollback()
        return error(f'评论发布失败: {str(e)}', 500)

@comment_bp.route('/comments/<int:comment_id>', methods=['DELETE'])
def delete_comment(comment_id):
    """删除评论"""
    try:
        comment = Comment.query.get_or_404(comment_id)
        db.session.delete(comment)
        db.session.commit()
        
        return success({'message': '评论删除成功'})
    except Exception as e:
        db.session.rollback()
        return error(f'评论删除失败: {str(e)}', 500)

# ========== 管理后台评论功能 ==========

@comment_bp.route('/admin/comments', methods=['GET'])
@jwt_required()
def get_all_comments():
    """获取所有评论（管理后台）"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        search = request.args.get('search', '')
        
        query = Comment.query
        
        if search:
            query = query.filter(
                Comment.author.ilike(f'%{search}%') | 
                Comment.content.ilike(f'%{search}%')
            )
        
        pagination = query.order_by(Comment.created_at.desc())\
            .paginate(page=page, per_page=per_page, error_out=False)
        
        comments = [comment.to_dict() for comment in pagination.items]
        
        return success({
            'comments': comments,
            'total': pagination.total,
            'pages': pagination.pages,
            'current_page': page
        })
    except Exception as e:
        return error(f'获取评论失败: {str(e)}', 500)

@comment_bp.route('/admin/comments/<int:comment_id>', methods=['DELETE'])
@jwt_required()
def admin_delete_comment(comment_id):
    """管理员删除评论"""
    try:
        comment = Comment.query.get_or_404(comment_id)
        db.session.delete(comment)
        db.session.commit()
        
        return success({'message': '评论删除成功'})
    except Exception as e:
        db.session.rollback()
        return error(f'评论删除失败: {str(e)}', 500)
