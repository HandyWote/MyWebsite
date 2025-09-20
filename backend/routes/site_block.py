from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from extensions import db
from models.site_block import SiteBlock
from extensions import socketio

site_block_bp = Blueprint('site_block', __name__)

@site_block_bp.route('/site-blocks', methods=['GET'])
@jwt_required()
def get_site_blocks():
    blocks = SiteBlock.query.all()
    return jsonify({'code': 0, 'msg': 'success', 'data': [
        {'name': b.name, 'content': b.content, 'updated_at': b.updated_at} for b in blocks
    ]})

@site_block_bp.route('/site-blocks', methods=['PUT'])
@jwt_required()
def update_site_blocks():
    data = request.json
    for item in data.get('blocks', []):
        block = SiteBlock.query.filter_by(name=item['name']).first()
        if block:
            block.content = item['content']
            db.session.commit()
    socketio.emit('site_block_updated', namespace='/site_blocks')
    return jsonify({'code': 0, 'msg': '更新成功'})