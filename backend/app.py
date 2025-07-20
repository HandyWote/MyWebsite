from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import os
import uuid
from werkzeug.utils import secure_filename
from flask import send_from_directory

app = Flask(__name__)

# 配置
config_name = os.environ.get('FLASK_ENV', 'development')
try:
    from config import config
    app.config.from_object(config[config_name])
except ImportError:
    # 如果没有配置文件，使用默认配置
    app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://username:password@localhost/handywote_articles'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['UPLOAD_FOLDER'] = 'uploads'
    app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# 允许的文件扩展名
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

# 确保上传目录存在
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

CORS(app)
db = SQLAlchemy(app)

# 数据模型
class Article(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    summary = db.Column(db.Text, nullable=False)
    content = db.Column(db.Text, nullable=False)
    cover_image = db.Column(db.String(255))
    category = db.Column(db.String(100), nullable=False)
    tags = db.Column(db.JSON)  # 存储标签数组
    views = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关联评论
    comments = db.relationship('Comment', backref='article', lazy=True, cascade='all, delete-orphan')

class Comment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    article_id = db.Column(db.Integer, db.ForeignKey('article.id'), nullable=False)
    author = db.Column(db.String(100), nullable=False)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# 路由
@app.route('/api/articles', methods=['GET'])
def get_articles():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    category = request.args.get('category')
    search = request.args.get('search')
    tag = request.args.get('tag')
    
    query = Article.query
    
    if category:
        query = query.filter(Article.category == category)
    
    if search:
        search_term = f'%{search}%'
        query = query.filter(
            db.or_(
                Article.title.ilike(search_term),
                Article.summary.ilike(search_term),
                Article.content.ilike(search_term)
            )
        )
    
    if tag:
        query = query.filter(Article.tags.contains([tag]))
    
    articles = query.order_by(Article.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    return jsonify({
        'articles': [{
            'id': article.id,
            'title': article.title,
            'summary': article.summary,
            'cover_image': article.cover_image,
            'category': article.category,
            'tags': article.tags,
            'views': article.views,
            'created_at': article.created_at.isoformat(),
            'comment_count': len(article.comments)
        } for article in articles.items],
        'total': articles.total,
        'pages': articles.pages,
        'current_page': page
    })

@app.route('/api/articles/<int:article_id>', methods=['GET'])
def get_article(article_id):
    article = Article.query.get_or_404(article_id)
    
    # 增加阅读量
    article.views += 1
    db.session.commit()
    
    return jsonify({
        'id': article.id,
        'title': article.title,
        'summary': article.summary,
        'content': article.content,
        'cover_image': article.cover_image,
        'category': article.category,
        'tags': article.tags,
        'views': article.views,
        'created_at': article.created_at.isoformat(),
        'updated_at': article.updated_at.isoformat(),
        'comments': [{
            'id': comment.id,
            'author': comment.author,
            'content': comment.content,
            'created_at': comment.created_at.isoformat()
        } for comment in article.comments]
    })

@app.route('/api/articles', methods=['POST'])
def create_article():
    data = request.json
    
    article = Article(
        title=data['title'],
        summary=data['summary'],
        content=data['content'],
        category=data['category'],
        tags=data.get('tags', [])
    )
    
    db.session.add(article)
    db.session.commit()
    
    return jsonify({'id': article.id, 'message': '文章创建成功'}), 201

@app.route('/api/articles/<int:article_id>/comments', methods=['POST'])
def add_comment(article_id):
    data = request.json
    
    comment = Comment(
        article_id=article_id,
        author=data['author'],
        content=data['content']
    )
    
    db.session.add(comment)
    db.session.commit()
    
    return jsonify({
        'id': comment.id,
        'message': '评论添加成功'
    }), 201

@app.route('/api/categories', methods=['GET'])
def get_categories():
    categories = db.session.query(Article.category).distinct().all()
    return jsonify([category[0] for category in categories])

@app.route('/api/tags', methods=['GET'])
def get_tags():
    articles = Article.query.all()
    all_tags = []
    for article in articles:
        if article.tags:
            all_tags.extend(article.tags)
    
    # 去重并统计
    tag_counts = {}
    for tag in all_tags:
        tag_counts[tag] = tag_counts.get(tag, 0) + 1
    
    return jsonify(tag_counts)

@app.route('/api/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': '没有文件'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': '没有选择文件'}), 400
    
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        # 添加唯一标识符避免文件名冲突
        unique_filename = f"{uuid.uuid4().hex}_{filename}"
        file.save(os.path.join(app.config['UPLOAD_FOLDER'], unique_filename))
        
        return jsonify({
            'filename': unique_filename,
            'url': f'/uploads/{unique_filename}'
        })
    
    return jsonify({'error': '不支持的文件类型'}), 400

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, host='0.0.0.0', port=5000) 