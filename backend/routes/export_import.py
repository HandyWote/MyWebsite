from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required
from extensions import db
from models.site_block import SiteBlock
from models.skill import Skill
from models.contact import Contact
from models.article import Article
from models.avatar import Avatar
import json

export_import_bp = Blueprint('export_import', __name__)

@export_import_bp.route('/export', methods=['GET'])
@jwt_required()
def export_data():
    data = {
        'site_blocks': [s.__dict__ for s in SiteBlock.query.all()],
        'skills': [s.__dict__ for s in Skill.query.filter_by(deleted_at=None).all()],
        'contacts': [c.__dict__ for c in Contact.query.filter_by(deleted_at=None).all()],
        'articles': [a.__dict__ for a in Article.query.filter_by(deleted_at=None).all()],
        'avatars': [a.__dict__ for a in Avatar.query.filter_by(deleted_at=None).all()],
        # 回收站数据不导出
    }
    # 过滤掉 _sa_instance_state
    for k, v in data.items():
        for item in v:
            item.pop('_sa_instance_state', None)
    return jsonify({'code': 0, 'msg': 'success', 'data': data})

@export_import_bp.route('/import', methods=['POST'])
@jwt_required()
def import_data():
    data = request.json
    try:
        # 导入站点内容
        if 'site_blocks' in data:
            for item in data['site_blocks']:
                existing = SiteBlock.query.get(item['id'])
                if existing:
                    db.session.merge(SiteBlock(**item))
                else:
                    db.session.add(SiteBlock(**item))

        # 导入技能
        if 'skills' in data:
            for item in data['skills']:
                existing = Skill.query.get(item['id'])
                if existing:
                    db.session.merge(Skill(**item))
                else:
                    db.session.add(Skill(**item))

        # 导入联系人
        if 'contacts' in data:
            for item in data['contacts']:
                existing = Contact.query.get(item['id'])
                if existing:
                    db.session.merge(Contact(**item))
                else:
                    db.session.add(Contact(**item))

        # 导入文章
        if 'articles' in data:
            for item in data['articles']:
                existing = Article.query.get(item['id'])
                if existing:
                    db.session.merge(Article(**item))
                else:
                    db.session.add(Article(**item))

        # 导入头像
        if 'avatars' in data:
            for item in data['avatars']:
                existing = Avatar.query.get(item['id'])
                if existing:
                    db.session.merge(Avatar(**item))
                else:
                    db.session.add(Avatar(**item))

        db.session.commit()
        return jsonify({'code': 0, 'msg': '导入成功'})
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f'导入失败: {str(e)}')
        current_app.logger.error(f'导入数据: {json.dumps(data, indent=2)}')
        return jsonify({
            'code': 1, 
            'msg': f'导入失败: {str(e)}',
            'error_details': str(e),
            'failed_data': data
        })
