from flask import Blueprint, request, jsonify, current_app
from extensions import db, socketio
from models.comment import Comment
from models.article import Article
from utils.response import success, error
from utils.comment_limits import check_comment_limit, get_comment_limit_info
from flask_jwt_extended import jwt_required, get_jwt_identity
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
        
        # 获取用户IP地址
        # 优先使用代理传递的IP地址，然后使用直接连接的IP地址
        ip_address = request.headers.get('X-Forwarded-For', request.headers.get('X-Real-IP', request.remote_addr))
        # 如果X-Forwarded-For包含多个IP，取第一个
        if ',' in ip_address:
            ip_address = ip_address.split(',')[0].strip()
        logger.info(f"用户IP地址: {ip_address}")
        
        # 获取用户身份（如果有）
        user_identity = None
        try:
            # 尝试获取JWT身份
            user_identity = get_jwt_identity()
            logger.info(f"用户身份: {user_identity}")
        except Exception as e:
            logger.info(f"未获取到用户身份: {e}")
        
        # 检查评论限制
        logger.info(f"开始检查评论限制...")
        try:
            can_comment, limit_reason = check_comment_limit(article_id, ip_address, user_identity)
            logger.info(f"评论限制检查结果: can_comment={can_comment}, reason={limit_reason}")
            
            if not can_comment:
                logger.warning(f"评论被限制: {limit_reason}")
                return error(limit_reason, 429)  # 429 Too Many Requests
        except Exception as e:
            logger.error(f"评论限制检查出错: {e}")
            import traceback
            logger.error(f"堆栈跟踪: {traceback.format_exc()}")
            # 出错时默认允许，避免误拒正常用户
        
        # 创建评论
        logger.info("开始创建评论")
        comment = Comment(
            article_id=article_id,
            author=data['author'].strip(),
            email=data.get('email', '').strip() or None,
            content=data['content'].strip(),
            ip_address=ip_address,
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
        socketio.emit('comments_updated', namespace='/comments')
        
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
        status = request.args.get('status', '')
        
        query = Comment.query
        
        if search:
            query = query.filter(
                Comment.author.ilike(f'%{search}%') | 
                Comment.content.ilike(f'%{search}%') |
                Comment.ip_address.ilike(f'%{search}%')
            )
        
        if status:
            query = query.filter(Comment.status == status)
        
        pagination = query.order_by(Comment.created_at.desc())\
            .paginate(page=page, per_page=per_page, error_out=False)
        
        # 获取评论数据并包含文章标题
        comments = []
        for comment in pagination.items:
            comment_dict = comment.to_dict()
            # 添加文章标题
            if comment.article:
                comment_dict['article_title'] = comment.article.title
            else:
                comment_dict['article_title'] = '未知文章'
            comments.append(comment_dict)
        
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
        socketio.emit('comments_updated', namespace='/comments')
        
        return success({'message': '评论删除成功'})
    except Exception as e:
        db.session.rollback()
        return error(f'评论删除失败: {str(e)}', 500)


@comment_bp.route('/admin/comments/<int:comment_id>/status', methods=['PUT'])
@jwt_required()
def update_comment_status(comment_id):
    """更新评论状态"""
    try:
        data = request.get_json()
        status = data.get('status')
        
        if not status:
            return error('状态不能为空', 400)
        
        comment = Comment.query.get_or_404(comment_id)
        comment.status = status
        db.session.commit()
        socketio.emit('comments_updated', namespace='/comments')
        
        return success({'message': '评论状态更新成功'})
    except Exception as e:
        db.session.rollback()
        return error(f'评论状态更新失败: {str(e)}', 500)


@comment_bp.route('/admin/comments/limits', methods=['GET'])
@jwt_required()
def get_comment_limits():
    """获取评论限制配置（管理后台）"""
    try:
        from utils.comment_limits import get_comment_limit_info
        limits_info = get_comment_limit_info()
        return success(limits_info)
    except Exception as e:
        return error(f'获取评论限制配置失败: {str(e)}', 500)


@comment_bp.route('/admin/comments/export', methods=['GET'])
@jwt_required()
def export_comments():
    """导出评论数据"""
    try:
        import csv
        from io import StringIO
        from flask import make_response
        
        # 获取查询参数
        search = request.args.get('search', '')
        status = request.args.get('status', '')
        
        # 构建查询
        query = Comment.query
        
        if search:
            query = query.filter(
                Comment.author.ilike(f'%{search}%') | 
                Comment.content.ilike(f'%{search}%') |
                Comment.ip_address.ilike(f'%{search}%')
            )
        
        if status:
            query = query.filter(Comment.status == status)
        
        # 获取所有评论
        comments = query.order_by(Comment.created_at.desc()).all()
        
        # 创建CSV数据
        output = StringIO()
        writer = csv.writer(output)
        
        # 写入表头
        writer.writerow([
            'ID', '文章ID', '作者', '邮箱', '内容', 'IP地址', 
            '状态', '创建时间', '更新时间'
        ])
        
        # 写入数据
        for comment in comments:
            writer.writerow([
                comment.id,
                comment.article_id,
                comment.author,
                comment.email or '',
                comment.content,
                comment.ip_address,
                comment.status,
                comment.created_at.strftime('%Y-%m-%d %H:%M:%S') if comment.created_at else '',
                comment.updated_at.strftime('%Y-%m-%d %H:%M:%S') if comment.updated_at else ''
            ])
        
        # 创建响应
        output.seek(0)
        response = make_response(output.getvalue())
        response.headers['Content-Type'] = 'text/csv'
        response.headers['Content-Disposition'] = f'attachment; filename=comments_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
        
        return response
    except Exception as e:
        return error(f'导出评论数据失败: {str(e)}', 500)
