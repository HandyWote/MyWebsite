from flask import Blueprint, request, jsonify
from extensions import db
from models.comment import Comment
from models.article import Article
from utils.response import success, error
from flask_jwt_extended import jwt_required
from datetime import datetime
import logging

# 配置日志
logger = logging.getLogger(__name__)

comment_bp = Blueprint('comment', __name__)

@comment_bp.route('/articles/<int:article_id>/comments', methods=['GET'])
def get_article_comments(article_id):
    """获取文章评论列表"""
    try:
        # 添加调试日志
        logger.info(f"=== 调试信息 ===")
        logger.info(f"get_article_comments 被调用")
        logger.info(f"article_id: {article_id} (type: {type(article_id)})")
        
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        # 验证文章存在 - 暂时移除 deleted_at=None 条件进行调试
        logger.info(f"开始查询文章，ID: {article_id}")
        article = Article.query.filter_by(id=article_id).first()
        logger.info(f"查询结果: {article}")
        
        if not article:
            logger.warning(f"文章不存在，ID: {article_id}")
            return error('文章不存在', 404)
        
        logger.info(f"找到文章: {article.title}, deleted_at: {article.deleted_at}")
        
        # 获取评论分页
        logger.info(f"开始查询评论，article_id: {article_id}")
        pagination = Comment.query.filter_by(article_id=article_id)\
            .order_by(Comment.created_at.desc())\
            .paginate(page=page, per_page=per_page, error_out=False)
        
        comments = [comment.to_dict() for comment in pagination.items]
        logger.info(f"找到评论数量: {len(comments)}")
        
        result = {
            'comments': comments,
            'total': pagination.total,
            'pages': pagination.pages,
            'current_page': page
        }
        logger.info(f"返回结果: {result}")
        
        return success(result)
    except Exception as e:
        logger.error(f"获取评论失败: {str(e)}")
        logger.error(f"异常类型: {type(e)}")
        import traceback
        logger.error(f"堆栈跟踪: {traceback.format_exc()}")
        return error(f'获取评论失败: {str(e)}', 500)

@comment_bp.route('/articles/<int:article_id>/comments', methods=['POST'])
def create_comment(article_id):
    """创建新评论"""
    try:
        logger.info(f"=== 创建评论调试信息 ===")
        logger.info(f"create_comment 被调用")
        logger.info(f"article_id: {article_id}")
        
        data = request.get_json()
        logger.info(f"请求数据: {data}")
        
        # 验证必填字段
        if not data.get('author') or not data.get('content'):
            logger.warning("作者或内容为空")
            return error('作者和内容不能为空', 400)
        
        # 验证文章存在 - 暂时移除 deleted_at=None 条件进行调试
        logger.info(f"查询文章是否存在，ID: {article_id}")
        article = Article.query.filter_by(id=article_id).first()
        logger.info(f"文章查询结果: {article}")
        
        if not article:
            logger.warning(f"文章不存在，ID: {article_id}")
            return error('文章不存在', 404)
        
        logger.info(f"找到文章: {article.title}, deleted_at: {article.deleted_at}")
        
        # 创建评论
        logger.info("开始创建评论")
        comment = Comment(
            article_id=article_id,
            author=data['author'].strip(),
            email=data.get('email', '').strip() or None,
            content=data['content'].strip(),
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent', '')
        )
        
        logger.info(f"评论对象: {comment}")
        
        db.session.add(comment)
        db.session.commit()
        
        logger.info("评论创建成功")
        
        return success({
            'comment': comment.to_dict(),
            'message': '评论发布成功'
        }, 201)
    except Exception as e:
        db.session.rollback()
        logger.error(f"评论发布失败: {str(e)}")
        logger.error(f"异常类型: {type(e)}")
        import traceback
        logger.error(f"堆栈跟踪: {traceback.format_exc()}")
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
