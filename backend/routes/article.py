from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from extensions import db, socketio
from models.article import Article
from services.ai import analyze_article_content
from services.file import save_pdf_file, delete_pdf_file, allowed_pdf_file
from datetime import datetime
import os
from flask import send_from_directory
from werkzeug.utils import secure_filename
import uuid
from utils.image_utils import convert_to_webp, should_convert_to_webp, get_webp_filename

UPLOAD_FOLDER = 'uploads'  # 可根据实际情况调整
ALLOWED_IMAGE_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'}

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
        {'id': a.id, 'title': a.title, 'category': a.category, 'tags': a.tags, 'cover': a.cover, 'summary': a.summary, 'content_type': a.content_type, 'pdf_filename': a.pdf_filename, 'created_at': a.created_at, 'updated_at': a.updated_at} for a in pagination.items
    ], 'total': pagination.total, 'pages': pagination.pages, 'current_page': page})

@article_bp.route('/articles', methods=['POST'])
@jwt_required()
def add_article():
    data = request.json

    # 验证内容类型和相关字段
    content_type = data.get('content_type', 'markdown')
    if content_type not in ['markdown', 'pdf']:
        return jsonify({'code': 1, 'msg': '无效的内容类型'}), 400

    if content_type == 'markdown':
        if not data.get('content'):
            return jsonify({'code': 1, 'msg': 'Markdown内容不能为空'}), 400
    elif content_type == 'pdf':
        if not data.get('pdf_filename'):
            return jsonify({'code': 1, 'msg': 'PDF文件不能为空'}), 400

    # TODO: AI补全分类/标签
    article = Article(
        title=data['title'],
        category=data.get('category', ''),
        tags=data.get('tags', ''),
        cover=data.get('cover', ''),
        summary=data.get('summary', ''),
        content=data.get('content', ''),
        content_type=content_type,
        pdf_filename=data.get('pdf_filename', '')
    )
    db.session.add(article)
    db.session.commit()
    socketio.emit('articles_updated', namespace='/articles')
    return jsonify({'code': 0, 'msg': '新增成功', 'id': article.id})

@article_bp.route('/articles/<int:article_id>', methods=['PUT'])
@jwt_required()
def update_article(article_id):
    data = request.json
    article = Article.query.get_or_404(article_id)

    # 如果修改了内容类型，需要验证
    if 'content_type' in data:
        new_content_type = data['content_type']
        if new_content_type not in ['markdown', 'pdf']:
            return jsonify({'code': 1, 'msg': '无效的内容类型'}), 400

        # 验证新内容类型的必填字段
        if new_content_type == 'markdown':
            if 'content' in data and not data['content']:
                return jsonify({'code': 1, 'msg': 'Markdown内容不能为空'}), 400
        elif new_content_type == 'pdf':
            if 'pdf_filename' in data and not data['pdf_filename']:
                return jsonify({'code': 1, 'msg': 'PDF文件不能为空'}), 400

    article.title = data.get('title', article.title)
    article.category = data.get('category', article.category)
    article.tags = data.get('tags', article.tags)
    article.cover = data.get('cover', article.cover)
    article.summary = data.get('summary', article.summary)
    article.content = data.get('content', article.content)
    article.content_type = data.get('content_type', article.content_type)
    article.pdf_filename = data.get('pdf_filename', article.pdf_filename)
    article.updated_at = datetime.utcnow()
    db.session.commit()
    socketio.emit('articles_updated', namespace='/articles')
    return jsonify({'code': 0, 'msg': '更新成功'})

@article_bp.route('/articles/<int:article_id>', methods=['DELETE'])
@jwt_required()
def delete_article(article_id):
    article = Article.query.get_or_404(article_id)

    # 如果文章是PDF类型，删除关联的PDF文件
    if article.content_type == 'pdf' and article.pdf_filename:
        try:
            delete_pdf_file(article.pdf_filename)
        except Exception as e:
            # 记录错误但不影响文章删除
            print(f"删除PDF文件失败: {e}")

    article.deleted_at = datetime.utcnow()
    db.session.commit()
    socketio.emit('articles_updated', namespace='/articles')
    return jsonify({'code': 0, 'msg': '删除成功'})

@article_bp.route('/articles/ai-analyze', methods=['POST'])
@jwt_required()
def ai_analyze_article():
    """
    AI智能分析文章内容，提供分类和标签建议
    """
    data = request.json

    # 验证必需参数
    if not data.get('title') or not data.get('content'):
        return jsonify({
            'code': 1,
            'msg': '标题和内容不能为空',
            'data': None
        }), 400

    title = data.get('title', '').strip()
    content = data.get('content', '').strip()
    summary = (data.get('summary') or '').strip()  # 修复：处理 None 值

    # 调用AI分析服务
    result = analyze_article_content(title, content, summary)

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
    
    # 临时文件名（原格式）
    temp_filename = f"{uuid.uuid4().hex}.{ext}"
    temp_path = os.path.join(UPLOAD_FOLDER, temp_filename)
    
    # 保存原始文件
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    file.save(temp_path)
    
    try:
        # 判断是否需要转换为webp格式
        if should_convert_to_webp(temp_filename):
            # 转换为webp格式
            webp_filename = get_webp_filename(temp_filename)
            webp_path = os.path.join(UPLOAD_FOLDER, webp_filename)
            
            # 执行转换
            if convert_to_webp(temp_path, webp_path):
                # 转换成功，删除临时文件，使用webp文件
                os.remove(temp_path)
                final_filename = webp_filename
            else:
                # 转换失败，使用原始文件
                final_filename = temp_filename
        else:
            # 已经是webp格式，直接使用
            final_filename = temp_filename
        
        url = f"/api/admin/articles/cover/{final_filename}"
        return jsonify({'code': 0, 'msg': '上传成功', 'url': url})
        
    except Exception as e:
        # 发生错误，清理临时文件
        if os.path.exists(temp_path):
            os.remove(temp_path)
        return jsonify({'code': 1, 'msg': f'上传失败: {str(e)}'}), 500

# 2. 文章封面图片静态访问接口
@article_bp.route('/articles/cover/<filename>')
def get_article_cover(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

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
    socketio.emit('articles_updated', namespace='/articles')
    return jsonify({'code': 0, 'msg': f'已批量删除{len(articles)}篇文章'})

# 5. PDF文件上传接口
@article_bp.route('/articles/pdf/upload', methods=['POST'])
@jwt_required()
def upload_article_pdf():
    """上传文章PDF文件"""
    if 'file' not in request.files:
        return jsonify({'code': 1, 'msg': '未上传文件'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'code': 1, 'msg': '文件名为空'}), 400

    try:
        # 保存PDF文件
        filename, save_path = save_pdf_file(file)

        # 返回访问URL
        url = f"/api/articles/pdf/{filename}"
        return jsonify({'code': 0, 'msg': '上传成功', 'filename': filename, 'url': url})

    except ValueError as e:
        return jsonify({'code': 1, 'msg': str(e)}), 400
    except Exception as e:
        return jsonify({'code': 1, 'msg': f'上传失败: {str(e)}'}), 500

# 6. PDF文件删除接口
@article_bp.route('/articles/pdf/delete', methods=['POST'])
@jwt_required()
def delete_article_pdf():
    """删除文章PDF文件"""
    data = request.json
    filename = data.get('filename')

    if not filename:
        return jsonify({'code': 1, 'msg': '未提供文件名'}), 400

    try:
        # 删除PDF文件
        success = delete_pdf_file(filename)
        if success:
            return jsonify({'code': 0, 'msg': '删除成功'})
        else:
            return jsonify({'code': 1, 'msg': '文件不存在'}), 404
    except Exception as e:
        return jsonify({'code': 1, 'msg': f'删除失败: {str(e)}'}), 500
